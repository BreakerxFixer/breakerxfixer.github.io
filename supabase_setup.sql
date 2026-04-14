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
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Create Challenges Table (Challenge Metadata)
CREATE TABLE IF NOT EXISTS public.challenges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  points INTEGER NOT NULL,
  flag_hash TEXT NOT NULL, -- SHA256 of the flag
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Challenges (Read only for everyone)
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Challenges are viewable by everyone" ON public.challenges FOR SELECT USING (true);

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

-- 4. Secure Flag Submission Function (RPC)
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
BEGIN
    -- Check if user is authenticated
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'NOT_AUTHENTICATED');
    END IF;

    -- Check if already solved
    SELECT EXISTS (SELECT 1 FROM public.solves WHERE user_id = auth.uid() AND challenge_id = challenge_id_param) INTO already_solved;
    IF already_solved THEN
        RETURN jsonb_build_object('success', false, 'message', 'ALREADY_SOLVED');
    END IF;

    -- Get challenge info
    SELECT flag_hash, points FROM public.challenges WHERE id = challenge_id_param INTO correct_hash, pts_to_add;
    
    -- Verify Flag (Using pgcrypto digest for SHA256)
    IF encode(digest(submitted_flag, 'sha256'), 'hex') = correct_hash THEN
        -- Insert into solves
        INSERT INTO public.solves (user_id, challenge_id) VALUES (auth.uid(), challenge_id_param);
        
        -- Update user points
        UPDATE public.profiles SET points = points + pts_to_add WHERE id = auth.uid();
        
        RETURN jsonb_build_object('success', true, 'message', 'FLAG_CORRECT', 'points_earned', pts_to_add);
    ELSE
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
INSERT INTO public.challenges (id, title, difficulty, points, flag_hash) VALUES
('M01', 'The Ghost Endpoint', 'Easy', 50, '21b6857a2093373f017a72d18eb538b72a14e39c021d9f32ae0851eea3a01155'),
('M02', 'Identity Crisis', 'Easy', 50, '960cdffeaffb8a4fddc9bb2347ece0aacc4def3771ae2c2fafe54e899e14c00a'),
('M03', 'The Impostor', 'Easy', 75, '0a811a892e62469543b0dac0b3a5a1329ad71af343629646576ffeb05ff30a6a'),
('M04', 'Unstoppable Force', 'Medium', 150, '57edef7521df0d0007f9a1ae844967ddbe1d4e499477d7a0c5d27af3953618d2'),
('M05', 'Logic Fallacy', 'Medium', 150, '03c9cf04be4ab2aad77c272e909c09d13c204f4fde1a228d11111a13ad9b11d8'),
('M06', 'The Wanderer', 'Medium', 200, 'aff4133c011647c115181c27135f930718e9c06c4c96f2fff1a55530bb80e0e0'),
('M07', 'Phantom Ping', 'Hard', 400, '3072cf0506599beb5f175cd98f376af0a67538441fdc85c2f79cdf243b3555ac'),
('M08', 'Shattered Trust', 'Hard', 400, '8084fff4c21602da851339dab0512608675c557712be577d043a147d4b663dab'),
('M09', 'Careless Whispers', 'Easy', 50, '4a7087a9f1d4faa4481255f15e5deee973b45e6480b3cddb468eaefe47c407ae'),
('M10', 'NoSQL Nightmare', 'Insane', 1000, 'f213e7c02060102dc929d1cc397ce5ec9a16dce0d69598387b3b9cf24a4e9298')
ON CONFLICT (id) DO UPDATE SET flag_hash = EXCLUDED.flag_hash;
