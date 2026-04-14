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
('M01', 'The Ghost Endpoint', 'Easy', 50, '6f651a7676d03de19e09b3e645051ee13ec1f637c5d4f6c1d2ac85219d0cd8a8'),
('M02', 'Identity Crisis', 'Easy', 50, 'b39c7edd742734a3ccb8f26c054fc35564eba9c65db2376a25e1a648bca50bdb'),
('M03', 'The Impostor', 'Easy', 75, 'd386d84344d8b459307cd7229203aebcc040f7bc56f3ec894fa794ef04bcdfce'),
('M04', 'Unstoppable Force', 'Medium', 150, '037c1ad077f13ae46046a0d9ba01d379b85851d5901c99b07a62c404b2a9fcfd'),
('M05', 'Logic Fallacy', 'Medium', 150, 'becac5bfd3860b1578a738f1468f834d965c3be08003a7de3c41e3db326908c7'),
('M06', 'The Wanderer', 'Medium', 200, '50029693239df33dac5f06fa327506094dfedeac38b599772b7c78ac8aa777df'),
('M07', 'Phantom Ping', 'Hard', 400, 'f545da3bdfea87a6e3eb1e204fdee40f66da7164e8f8a2f057758ec06e0f6253'),
('M08', 'Shattered Trust', 'Hard', 400, '726579cfc8ba8929fd5527b56b8b19a73ae281d973f6f3eeb0fe3a961e1be5d5'),
('M09', 'Careless Whispers', 'Easy', 50, '3ddaa4a7c33f2e6aa0d565f2deee27439567cf96142ae4071404cab19b96dffb'),
('M10', 'NoSQL Nightmare', 'Insane', 1000, '05ad0a82dea2057c151770cfd7bf1c049eb663ef33574b58d48495e7462044aa')
ON CONFLICT (id) DO UPDATE SET flag_hash = EXCLUDED.flag_hash;
