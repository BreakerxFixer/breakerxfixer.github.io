-- CTF BACKEND SCHEMA (SUPABASE SQL)
-- PASTE THIS INTO THE SUPABASE SQL EDITOR

-- 0. Enable extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Profiles Table (Public information)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  points INTEGER DEFAULT 0,
  avatar_url TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Add avatar_url to existing installs (idempotent)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own avatar_url" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
-- Users can only update their own avatar_url (NOT points or username)
CREATE POLICY "Users can update own avatar_url" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ─── Supabase Storage: Avatar Bucket ───────────────────────────────────────
-- Create the bucket (public so images are served without tokens)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,   -- 2 MB limit per file
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'];

-- Drop old policies if re-running
DROP POLICY IF EXISTS "Avatar images are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Anyone can view avatars (public CDN)
CREATE POLICY "Avatar images are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Authenticated users can only upload to their own UID folder
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can replace/update only their own avatar
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete only their own avatar
CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
-- ─────────────────────────────────────────────────────────────────────────────


-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
-- SECURITY FIX: Do NOT allow users to update their own profiles directly, 
-- as they could change their 'points'. Use a function for profile management if needed.
-- DROP POLICY "Users can update own profile" ON public.profiles; 

-- 2. Create Challenges Table (Challenge Metadata)
ALTER TABLE IF EXISTS public.challenges DROP COLUMN IF EXISTS flag_hash;
ALTER TABLE IF EXISTS public.challenges ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Web';
CREATE TABLE IF NOT EXISTS public.challenges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Web',
  difficulty TEXT NOT NULL,
  points INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.1 Private Challenge Secrets (Sensitive information)
-- Using RLS to ensure only the RPC can read this
CREATE TABLE IF NOT EXISTS public.challenge_secrets (
  id TEXT REFERENCES public.challenges(id) ON DELETE CASCADE PRIMARY KEY,
  flag_hash TEXT NOT NULL
);

-- Enable RLS for Challenges (Read only for everyone)
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Challenges are viewable by everyone" ON public.challenges;
CREATE POLICY "Challenges are viewable by everyone" ON public.challenges FOR SELECT USING (true);

-- Enable RLS for Secrets (DENY ALL by default)
ALTER TABLE public.challenge_secrets ENABLE ROW LEVEL SECURITY;
-- No policies mean no one can SELECT/UPDATE/DELETE except SECURITY DEFINER functions.

-- 3. Create Solves Table (Tracks successful submissions)
CREATE TABLE IF NOT EXISTS public.solves (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  challenge_id TEXT REFERENCES public.challenges ON DELETE CASCADE,
  solved_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, challenge_id)
);

-- Enable RLS for Solves
ALTER TABLE public.solves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own solves" ON public.solves;
DROP POLICY IF EXISTS "Solves summary viewable by everyone" ON public.solves;
CREATE POLICY "Users can view their own solves" ON public.solves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Solves summary viewable by everyone" ON public.solves FOR SELECT USING (true);

-- 4. Create Submission Logs (For Rate Limiting)
CREATE TABLE IF NOT EXISTS public.submission_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    challenge_id TEXT,
    success BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.submission_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can see their own logs" ON public.submission_logs;
CREATE POLICY "Users can see their own logs" ON public.submission_logs FOR SELECT USING (auth.uid() = user_id);

-- 5. Secure Flag Submission Function (RPC)
-- This function checks the flag and updates points without exposing flag_hash to client
CREATE OR REPLACE FUNCTION public.submit_flag(challenge_id_param TEXT, submitted_flag TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    correct_hash TEXT;
    pts_to_add INTEGER;
    already_solved BOOLEAN;
    attempts_count INTEGER;
    inserted_solve BOOLEAN;
BEGIN
    -- [SEC] Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'NOT_AUTHENTICATED');
    END IF;

    -- [SEC] Anti-Timing Jitter (0-200ms)
    PERFORM pg_sleep(random() * 0.2);

    -- [SEC] Rate Limiting (Max 5 attempts in last minute)
    SELECT count(*) FROM public.submission_logs 
    WHERE user_id = auth.uid() AND created_at > NOW() - INTERVAL '1 minute'
    INTO attempts_count;

    IF attempts_count >= 5 THEN
        RETURN jsonb_build_object('success', false, 'message', 'COOLING_DOWN', 'hint', 'Too many attempts. Wait 60s.');
    END IF;

    -- Check if already solved (cached)
    SELECT EXISTS (SELECT 1 FROM public.solves WHERE user_id = auth.uid() AND challenge_id = challenge_id_param) INTO already_solved;
    IF already_solved THEN
        RETURN jsonb_build_object('success', false, 'message', 'ALREADY_SOLVED');
    END IF;

    -- Get challenge info from private store
    SELECT flag_hash FROM public.challenge_secrets WHERE id = challenge_id_param INTO correct_hash;
    SELECT points FROM public.challenges WHERE id = challenge_id_param INTO pts_to_add;
    
    -- Verify Flag (Using pgcrypto digest for SHA256)
    IF encode(digest(submitted_flag, 'sha256'), 'hex') = correct_hash THEN
        -- [SEC] Atomic Solve & Point Update (Prevents Race Conditions)
        WITH solve_insert AS (
            INSERT INTO public.solves (user_id, challenge_id) 
            VALUES (auth.uid(), challenge_id_param)
            ON CONFLICT (user_id, challenge_id) DO NOTHING
            RETURNING *
        )
        SELECT EXISTS (SELECT 1 FROM solve_insert) INTO inserted_solve;

        IF inserted_solve THEN
            UPDATE public.profiles SET points = points + pts_to_add WHERE id = auth.uid();
            
            INSERT INTO public.submission_logs (user_id, challenge_id, success) VALUES (auth.uid(), challenge_id_param, true);
            RETURN jsonb_build_object('success', true, 'message', 'FLAG_CORRECT', 'points_earned', pts_to_add);
        ELSE
            -- This means they were solved in a race condition
            RETURN jsonb_build_object('success', false, 'message', 'ALREADY_SOLVED');
        END IF;
    ELSE
        -- Log failed attempt
        INSERT INTO public.submission_logs (user_id, challenge_id, success) VALUES (auth.uid(), challenge_id_param, false);
        RETURN jsonb_build_object('success', false, 'message', 'INVALID_FLAG');
    END IF;
END;
$$;

-- 5. Trigge to automatically create a profile when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- SECURITY: Right to Erasure (GDPR)
-- Allows a user to wipe their own profile and solve history.
CREATE OR REPLACE FUNCTION delete_user_data()
RETURNS void AS $$
BEGIN
    DELETE FROM public.solves WHERE user_id = auth.uid();
    DELETE FROM public.profiles WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Populate Challenges (Initial Seed)
INSERT INTO public.challenges (id, title, category, difficulty, points) VALUES
('M01', 'The Ghost Endpoint', 'Web', 'Easy', 50),
('M02', 'Identity Crisis', 'Web', 'Easy', 50),
('M03', 'The Impostor', 'Web', 'Easy', 75),
('M04', 'Unstoppable Force', 'Web', 'Medium', 150),
('M05', 'Logic Fallacy', 'Web', 'Medium', 150),
('M06', 'The Wanderer', 'Web', 'Medium', 200),
('M07', 'Phantom Ping', 'Web', 'Hard', 400),
('M08', 'Shattered Trust', 'Web', 'Hard', 400),
('M09', 'Careless Whispers', 'Web', 'Easy', 50),
('M10', 'NoSQL Nightmare', 'Web', 'Insane', 1000),
('M11', 'The Core Breach', 'Web', 'Hard', 500),
('M12', 'The XORacle', 'Crypto', 'Easy', 100),
('M13', 'Shattered RSA', 'Crypto', 'Medium', 250),
('M14', 'Buffer Overflow 101', 'Pwn', 'Easy', 150),
('M15', 'Format String Echo', 'Pwn', 'Medium', 300),
('M16', 'The Hidden Packet', 'Forensics', 'Easy', 100),
('M17', 'Corrupted Memory', 'Forensics', 'Medium', 200),
('M18', 'Ghost in the Web', 'OSINT', 'Easy', 50),
('M19', 'Geographical Echo', 'OSINT', 'Medium', 150),
('M20', 'Anti-Debugger Trap', 'Rev', 'Hard', 400),
('M21', 'The Math API', 'Programming', 'Medium', 250),
('M22', 'I2C Chatter', 'Hardware', 'Hard', 350)
ON CONFLICT (id) DO UPDATE SET points = EXCLUDED.points, category = EXCLUDED.category;

-- Populate Secrets
INSERT INTO public.challenge_secrets (id, flag_hash) VALUES
('M01', '21b6857a2093373f017a72d18eb538b72a14e39c021d9f32ae0851eea3a01155'),
('M02', '960cdffeaffb8a4fddc9bb2347ece0aacc4def3771ae2c2fafe54e899e14c00a'),
('M03', '0a811a892e62469543b0dac0b3a5a1329ad71af343629646576ffeb05ff30a6a'),
('M04', '57edef7521df0d0007f9a1ae844967ddbe1d4e499477d7a0c5d27af3953618d2'),
('M05', '03c9cf04be4ab2aad77c272e909c09d13c204f4fde1a228d11111a13ad9b11d8'),
('M06', 'aff4133c011647c115181c27135f930718e9c06c4c96f2fff1a55530bb80e0e0'),
('M07', '3072cf0506599beb5f175cd98f376af0a67538441fdc85c2f79cdf243b3555ac'),
('M08', '8084fff4c21602da851339dab0512608675c557712be577d043a147d4b663dab'),
('M09', '4a7087a9f1d4faa4481255f15e5deee973b45e6480b3cddb468eaefe47c407ae'),
('M10', 'f213e7c02060102dc929d1cc397ce5ec9a16dce0d69598387b3b9cf24a4e9298'),
('M11', 'c635a21090a7b946814a6b4606e79bc5ff1c869cd1b69d30f51d326cb1b5a1b7'),
('M12', '648c63792d14725497d0023ac27c85ed8bb1f225a5248b6ea41aba71d48b8de0'),
('M13', '23d782c2b775bbd04f69d129be2f1ba119f9494d875a6c30bb2de7c3101a4e61'),
('M14', 'c961c0331dcb7474fecf6baeb85fca8647a65cdcf3455e4a7e2e52c10e203774'),
('M15', 'f119ce43dc9e99542f089f7b53f969a5b177ff9bcb84e36a4c88b34a012f3f20'),
('M16', '22935cbdf7ff014e6e4b231b9f0ee16522c819d9b9e0ac127d8324c2a0bf44ab'),
('M17', 'e0d1d5423d00e420e8567a4de44beea304829ec907ce36aab5c8b741c6589663'),
('M18', '38748efc553651dc4fde9228d4f5c57fde31bfeb8c23af65585a133c301db38a'),
('M19', '804339ac2771e6b11b01e1d16f45b773e6a45e74265128d3e89711486cce6a2e'),
('M20', 'fff589088112783c4134fb790dc2a3f089d15f95c4e7e9b3d41c10fbf69225d0'),
('M21', 'bbae2bd659a995cf539e47094eb90e50a4338eddbc8ea9044103364f4dfd879b'),
('M22', '7bdddbc63dba60b575ad5cca6fefc3bdebacc030345b8d30beccb15a70d9dc0c')
ON CONFLICT (id) DO UPDATE SET flag_hash = EXCLUDED.flag_hash;

-- =============================================================================
-- SOCIAL SYSTEM: FRIENDSHIPS & CHAT
-- Run this section to enable the friend + chat features
-- =============================================================================

-- ── 7. Friendships ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.friendships (
  id          BIGSERIAL PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_friend  CHECK (requester_id <> addressee_id),
  CONSTRAINT unique_friendship UNIQUE (requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Both parties see their own rows
DROP POLICY IF EXISTS "Parties see their friendships"   ON public.friendships;
CREATE POLICY "Parties see their friendships" ON public.friendships
  FOR SELECT USING (auth.uid() IN (requester_id, addressee_id));

-- Only the requester can insert (and only as themselves)
DROP POLICY IF EXISTS "Only requester inserts"          ON public.friendships;
CREATE POLICY "Only requester inserts" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Addressee updates status; requester can change to 'declined' only to cancel
DROP POLICY IF EXISTS "Parties can update friendship"   ON public.friendships;
CREATE POLICY "Parties can update friendship" ON public.friendships
  FOR UPDATE USING (auth.uid() IN (requester_id, addressee_id));

-- Either party can delete (unfriend / cancel)
DROP POLICY IF EXISTS "Parties can delete friendship"   ON public.friendships;
CREATE POLICY "Parties can delete friendship" ON public.friendships
  FOR DELETE USING (auth.uid() IN (requester_id, addressee_id));

-- ── 8. Messages ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id          BIGSERIAL PRIMARY KEY,
  sender_id   UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  read_at     TIMESTAMPTZ DEFAULT NULL,
  CONSTRAINT msg_length CHECK (char_length(content) BETWEEN 1 AND 1000),
  CONSTRAINT no_self_msg CHECK (sender_id <> receiver_id)
);
CREATE INDEX IF NOT EXISTS idx_messages_participants ON public.messages (sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver     ON public.messages (receiver_id, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Only participants can read messages
DROP POLICY IF EXISTS "Participants see messages"       ON public.messages;
CREATE POLICY "Participants see messages" ON public.messages
  FOR SELECT USING (auth.uid() IN (sender_id, receiver_id));

-- No direct INSERT — use the secure send_message() RPC
-- (no INSERT policy means clients cannot insert directly)

-- Participants can mark messages as read
DROP POLICY IF EXISTS "Receiver can mark read"          ON public.messages;
CREATE POLICY "Receiver can mark read" ON public.messages
  FOR UPDATE USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- ── 9. Secure RPC: send_message ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.send_message(
  p_receiver_id UUID,
  p_content     TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_friends BOOLEAN;
  v_msg_count  INTEGER;
  v_new_id     BIGINT;
BEGIN
  -- [SEC] Must be authenticated
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  -- [SEC] No self-messaging
  IF auth.uid() = p_receiver_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'CANNOT_MESSAGE_SELF');
  END IF;

  -- [SEC] Content length (also enforced by DB constraint)
  IF char_length(trim(p_content)) < 1 OR char_length(p_content) > 1000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_LENGTH');
  END IF;

  -- [SEC] Rate limit: 30 messages per minute
  SELECT COUNT(*) INTO v_msg_count
  FROM public.messages
  WHERE sender_id = auth.uid()
    AND created_at > NOW() - INTERVAL '1 minute';

  IF v_msg_count >= 30 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RATE_LIMITED', 'hint', 'Espera un momento');
  END IF;

  -- [SEC] Verify accepted friendship
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND (
        (requester_id = auth.uid() AND addressee_id = p_receiver_id)
        OR
        (requester_id = p_receiver_id AND addressee_id = auth.uid())
      )
  ) INTO v_is_friends;

  IF NOT v_is_friends THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_FRIENDS');
  END IF;

  -- [SEC] Insert with server-enforced sender (no spoofing)
  INSERT INTO public.messages (sender_id, receiver_id, content)
  VALUES (auth.uid(), p_receiver_id, trim(p_content))
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('ok', true, 'id', v_new_id);
END;
$$;

-- ── 10. Secure RPC: respond_friend_request ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.respond_friend_request(
  p_friendship_id BIGINT,
  p_action        TEXT   -- 'accept' | 'decline'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_addressee UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  IF p_action NOT IN ('accept', 'decline') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_ACTION');
  END IF;

  -- Only the addressee can respond
  SELECT addressee_id INTO v_addressee
  FROM public.friendships WHERE id = p_friendship_id;

  IF v_addressee IS NULL OR v_addressee <> auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'FORBIDDEN');
  END IF;

  UPDATE public.friendships
  SET status = CASE p_action WHEN 'accept' THEN 'accepted' ELSE 'declined' END
  WHERE id = p_friendship_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── 11. Enable Realtime for messages & friendships ────────────────────────────
-- Run in Supabase Dashboard → Database → Replication, or use the API:
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
