-- CTF BACKEND SCHEMA (SUPABASE SQL)
-- PASTE THIS INTO THE SUPABASE SQL EDITOR

-- 0. Enable extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Profiles Table (Public information)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
-- SECURITY FIX: Do NOT allow users to update their own profiles directly, 
-- as they could change their 'points'. Use a function for profile management if needed.
-- DROP POLICY "Users can update own profile" ON public.profiles; 

-- 2. Create Challenges Table (Challenge Metadata)
CREATE TABLE IF NOT EXISTS public.challenges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
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
INSERT INTO public.challenges (id, title, difficulty, points) VALUES
('M01', 'The Ghost Endpoint', 'Easy', 50),
('M02', 'Identity Crisis', 'Easy', 50),
('M03', 'The Impostor', 'Easy', 75),
('M04', 'Unstoppable Force', 'Medium', 150),
('M05', 'Logic Fallacy', 'Medium', 150),
('M06', 'The Wanderer', 'Medium', 200),
('M07', 'Phantom Ping', 'Hard', 400),
('M08', 'Shattered Trust', 'Hard', 400),
('M09', 'Careless Whispers', 'Easy', 50),
('M10', 'NoSQL Nightmare', 'Insane', 1000),
('M11', 'The Core Breach', 'Hard', 500)
ON CONFLICT (id) DO UPDATE SET points = EXCLUDED.points;

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
('M11', 'c635a21090a7b946814a6b4606e79bc5ff1c869cd1b69d30f51d326cb1b5a1b7')
ON CONFLICT (id) DO UPDATE SET flag_hash = EXCLUDED.flag_hash;
