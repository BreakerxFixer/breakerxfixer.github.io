-- 🧪 THE BREAKER && THE FIXER - DATABASE RESTORATION SCRIPT (SAFE VERSION)
-- PASTE THIS ENTIRE SCRIPT INTO THE SUPABASE SQL EDITOR AND RUN IT.
-- It is idempotent (safe to run multiple times).

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Seasons Infrastructure
CREATE TABLE IF NOT EXISTS public.seasons (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.seasons (id, name, description, is_active)
VALUES (0, 'Season 0', 'The Genesis Season', TRUE)
ON CONFLICT (id) DO UPDATE SET is_active = TRUE;

INSERT INTO public.seasons (id, name, description, is_active)
VALUES (1, 'Season 1', 'The Expansion', TRUE)
ON CONFLICT (id) DO UPDATE SET is_active = TRUE;

-- 2. Core Tables (Profiles & Challenges)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  points INTEGER DEFAULT 0,
  avatar_url TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

CREATE TABLE IF NOT EXISTS public.challenges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Web',
  difficulty TEXT NOT NULL,
  points INTEGER NOT NULL,
  description_en TEXT,
  description_es TEXT,
  tags TEXT[] DEFAULT '{}',
  assets JSONB DEFAULT '[]',
  season_id INTEGER REFERENCES public.seasons(id) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist for existing installs (Safe Migration)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS season_id INTEGER REFERENCES public.seasons(id) DEFAULT 0;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS description_es TEXT;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS assets JSONB DEFAULT '[]';
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Web';

-- 3. RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Challenges are viewable by everyone" ON public.challenges;
CREATE POLICY "Challenges are viewable by everyone" ON public.challenges FOR SELECT USING (true);

-- 4. Secrets & Solves
CREATE TABLE IF NOT EXISTS public.challenge_secrets (
  id TEXT REFERENCES public.challenges(id) ON DELETE CASCADE PRIMARY KEY,
  flag_hash TEXT NOT NULL
);
ALTER TABLE public.challenge_secrets ENABLE ROW LEVEL SECURITY; -- Deny all by default

CREATE TABLE IF NOT EXISTS public.solves (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  challenge_id TEXT REFERENCES public.challenges ON DELETE CASCADE,
  solved_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, challenge_id)
);
ALTER TABLE public.solves ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Solves summary viewable by everyone" ON public.solves;
CREATE POLICY "Solves summary viewable by everyone" ON public.solves FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.submission_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    challenge_id TEXT,
    success BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SECURE RPC CLOUD FUNCTIONS
-- 5.1 get_seasons (Essential for Seasonal Hub)
CREATE OR REPLACE FUNCTION public.get_seasons()
RETURNS SETOF public.seasons
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.seasons ORDER BY id ASC;
$$;

-- 5.2 get_leaderboard (Essential for Leaderboard)
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_season_id INTEGER DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    username TEXT,
    points BIGINT,
    avatar_url TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_season_id IS NULL OR p_season_id = -1 THEN
        RETURN QUERY
        SELECT p.id, p.username, p.points::BIGINT, p.avatar_url
        FROM public.profiles p
        -- Tie-breaker: ASC last solve (the one who reached the score sooner wins)
        ORDER BY p.points DESC, (SELECT MAX(solved_at) FROM public.solves WHERE user_id = p.id) ASC NULLS LAST
        LIMIT 100;
    ELSE
        RETURN QUERY
        SELECT p.id, p.username, COALESCE(SUM(c.points), 0)::BIGINT as points, p.avatar_url
        FROM public.profiles p
        JOIN public.solves s ON s.user_id = p.id
        JOIN public.challenges c ON c.id = s.challenge_id
        WHERE c.season_id = p_season_id
        GROUP BY p.id, p.username, p.avatar_url
        -- Tie-breaker: Earlier last solve within season wins
        ORDER BY points DESC, MAX(s.solved_at) ASC
        LIMIT 100;
    END IF;
END;
$$;

-- 5.3 submit_flag (Secure submission)
CREATE OR REPLACE FUNCTION public.submit_flag(challenge_id_param TEXT, submitted_flag TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    correct_hash TEXT;
    pts_to_add INTEGER;
    already_solved BOOLEAN;
    inserted_solve BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', false, 'message', 'NOT_AUTHENTICATED'); END IF;
    
    SELECT EXISTS (SELECT 1 FROM public.solves WHERE user_id = auth.uid() AND challenge_id = challenge_id_param) INTO already_solved;
    IF already_solved THEN RETURN jsonb_build_object('success', false, 'message', 'ALREADY_SOLVED'); END IF;

    SELECT flag_hash FROM public.challenge_secrets WHERE id = challenge_id_param INTO correct_hash;
    SELECT points FROM public.challenges WHERE id = challenge_id_param INTO pts_to_add;
    
    IF encode(digest(submitted_flag, 'sha256'), 'hex') = correct_hash THEN
        INSERT INTO public.solves (user_id, challenge_id) VALUES (auth.uid(), challenge_id_param)
        ON CONFLICT (user_id, challenge_id) DO NOTHING RETURNING true INTO inserted_solve;

        IF inserted_solve THEN
            UPDATE public.profiles SET points = points + pts_to_add WHERE id = auth.uid();
            INSERT INTO public.submission_logs (user_id, challenge_id, success) VALUES (auth.uid(), challenge_id_param, true);
            RETURN jsonb_build_object('success', true, 'message', 'FLAG_CORRECT', 'points_earned', pts_to_add);
        ELSE
            RETURN jsonb_build_object('success', false, 'message', 'ALREADY_SOLVED');
        END IF;
    ELSE
        INSERT INTO public.submission_logs (user_id, challenge_id, success) VALUES (auth.uid(), challenge_id_param, false);
        RETURN jsonb_build_object('success', false, 'message', 'INVALID_FLAG');
    END IF;
END; $$;

-- 5.4 respond_friend_request
DROP FUNCTION IF EXISTS public.respond_friend_request(BIGINT, TEXT);
CREATE OR REPLACE FUNCTION public.respond_friend_request(p_friendship_id BIGINT, p_action TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN 
        RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED'); 
    END IF;
    
    IF p_action = 'accept' THEN
        UPDATE public.friendships SET status = 'accepted' 
        WHERE id = p_friendship_id AND addressee_id = auth.uid();
        RETURN jsonb_build_object('ok', true);
    ELSIF p_action = 'decline' THEN
        DELETE FROM public.friendships 
        WHERE id = p_friendship_id AND (addressee_id = auth.uid() OR requester_id = auth.uid());
        RETURN jsonb_build_object('ok', true);
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_ACTION');
END; $$;

-- 5.5 send_message
DROP FUNCTION IF EXISTS public.send_message(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.send_message(p_receiver_id UUID, p_content TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_msg_id BIGINT;
BEGIN
    IF auth.uid() IS NULL THEN 
        RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED'); 
    END IF;
    
    -- Check if friends
    IF NOT EXISTS (
        SELECT 1 FROM public.friendships 
        WHERE status = 'accepted' AND 
        ((requester_id = auth.uid() AND addressee_id = p_receiver_id) OR
         (requester_id = p_receiver_id AND addressee_id = auth.uid()))
    ) THEN
        RETURN jsonb_build_object('ok', false, 'hint', 'Must be friends to message');
    END IF;

    INSERT INTO public.messages (sender_id, receiver_id, content)
    VALUES (auth.uid(), p_receiver_id, p_content)
    RETURNING id INTO v_msg_id;

    RETURN jsonb_build_object('ok', true, 'id', v_msg_id);
END; $$;

-- 5.6 delete_user_data (Hard Delete)
CREATE OR REPLACE FUNCTION public.delete_user_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- The CASCADE on profiles/solves/friendships will handle the rest
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- 6. Seed Data (M01-M22)
INSERT INTO public.challenges (id, title, category, difficulty, points, season_id, description_en, description_es) VALUES
('M01', 'The Ghost Endpoint', 'Web', 'Easy', 50, 0, 'We found a legacy API that doesn''t seem to have authentication. Find the sensitive data.', 'Encontramos una API antigua que no parece tener autenticación. Encuentra los datos sensibles.'),
('M02', 'Identity Crisis', 'Web', 'Easy', 50, 0, 'Someone left a debug parameter in the login process. Can you bypass it?', 'Alguien dejó un parámetro de depuración en el proceso de login. ¿Puedes saltarlo?'),
('M03', 'The Impostor', 'Web', 'Easy', 75, 0, 'A password reset tool is leaking tokens in the URL. Take over the admin account.', 'Una herramienta de reseteo de password filtra tokens en la URL. Toma la cuenta de admin.'),
('M04', 'Unstoppable Force', 'Web', 'Medium', 150, 0, 'The firewall is blocking traditional payloads. Try something more... recursive.', 'El firewall bloquea payloads tradicionales. Prueba algo más... recursivo.'),
('M05', 'Logic Fallacy', 'Web', 'Medium', 150, 0, 'The checkout system calculates prices client-side. Make it cheaper.', 'El sistema de pago calcula precios en el cliente. Hazlo más barato.'),
('M06', 'The Wanderer', 'Web', 'Medium', 200, 0, 'LFI is too simple. Find the path that leads to the server configuration.', 'LFI es demasiado simple. Encuentra la ruta que lleva a la config del servidor.'),
('M07', 'Phantom Ping', 'Web', 'Hard', 400, 0, 'The network diagnostic tool is running system commands directly. Chain your commands!', 'La herramienta de diagnóstico de red ejecuta comandos del sistema directamente. ¡Encadena tus comandos!'),
('M08', 'Shattered Trust', 'Web', 'Hard', 400, 0, 'They are using JWT for authentication. Decode the token, find their terrible secret.', 'Usan JWT para autenticarse. Decodifica el token, descubre su terrible secreto.'),
('M09', 'Careless Whispers', 'Web', 'Easy', 50, 0, 'Try bad methods. Sometimes what you can''t do reveals what you can.', 'Prueba métodos no permitidos. A veces lo bloqueado revela lo permitido.'),
('M10', 'NoSQL Nightmare', 'Web', 'Insane', 1000, 0, 'Modern databases require modern injections. Break the JSON logic operators.', 'Bases de datos modernas, inyecciones modernas. Rompe los operadores lógicos JSON.'),
('M11', 'The Core Breach', 'Web', 'Hard', 500, 0, 'The internal mainframe is air-gapped... Use the portal to reach the unreachable.', 'La unidad central está aislada... Usa el portal para llegar a lo inalcanzable.'),
('M12', 'The XORacle', 'Crypto', 'Easy', 100, 0, 'We intercepted an encrypted flag and a python script. Break the lock.', 'Interceptamos una flag cifrada y un script python. Rompe el candado.'),
('M13', 'Shattered RSA', 'Crypto', 'Medium', 250, 0, 'n=3891783853, e=65537, c=1130635294. The primes are weak! Decrypt c.', 'n=3891783853, e=65537, c=1130635294. ¡Primos débiles! Descifra c.'),
('M14', 'Buffer Overflow 101', 'Pwn', 'Easy', 150, 0, 'A classic mistake. Overwrite the volatile variables beside the buffer.', 'Error clásico. Sobrescribe las variables adyacentes al buffer.'),
('M15', 'Format String Echo', 'Pwn', 'Medium', 300, 0, 'The binary echoes your input improperly. Use it to leak the flag from memory.', 'El binario repite tu entrada incorrectamente. Úsalo para filtrar la flag.'),
('M16', 'Library Leak', 'Pwn', 'Hard', 450, 0, 'Leak the libc address to bypass ASLR and gain control of the execution flow.', 'Filtra la dirección de libc para saltar ASLR y ganar el control.'),
('M17', 'Deep Dive', 'Forensics', 'Easy', 75, 0, 'The flag is hidden inside this image. Metadata isn''t always enough.', 'La flag está dentro de esta imagen. Los metadatos no siempre bastan.'),
('M18', 'Lost Signal', 'Forensics', 'Medium', 200, 0, 'Analyze the PCAP file to reconstruct the sensitive transmission.', 'Analiza el archivo PCAP para reconstruir la transmisión sensible.'),
('M19', 'Social Engineering 101', 'OSINT', 'Easy', 50, 0, 'Find the personal email of the target from their last social media post.', 'Encuentra el email personal del objetivo tras su último post.'),
('M20', 'Shadow Realm', 'OSINT', 'Medium', 175, 0, 'Follow the digital breadcrumbs of the ghost entity across the deep web.', 'Sigue las migas digitales de la entidad fantasma por la deep web.'),
('M21', 'Malicious PDF', 'Reversing', 'Medium', 250, 0, 'This PDF contains suspicious Javascript. Deobfuscate it to find the flag.', 'Este PDF tiene JS sospechoso. Desofúscalo para hallar la flag.'),
('M22', 'Logic Gates', 'Hardware', 'Medium', 200, 0, 'Reverse the logical circuit provided to find the correct combination.', 'Analiza el circuito lógico para dar con la combinación correcta.'),
('S1M01', 'The Unseen Path', 'Web', 'Easy', 50, 1, 'Check the traditional hideout.', 'Revisa el escondite tradicional.'),
('S1M02', 'Ancient Cipher', 'Crypto', 'Easy', 50, 1, 'cvs{ebg13_vf_pynffvp}', 'cvs{ebg13_vf_pynffvp}'),
('S1M03', 'Commented Out', 'Web', 'Easy', 75, 1, 'The developers left something in the DOM.', 'Los desarrolladores dejaron algo en el DOM.'),
('S1M04', 'Custom Auth', 'Web', 'Easy', 75, 1, 'The portal expects X-Admin-Auth: enabled.', 'El portal espera X-Admin-Auth: enabled.'),
('S1M05', 'Embedded Truth', 'Forensics', 'Easy', 100, 1, 'A simple image hides a big secret.', 'Una simple imagen oculta un gran secreto.'),
('S1M06', 'Wrong Extension', 'Forensics', 'Medium', 150, 1, 'This PNG won''t open. Why?', 'Este PNG no abre. ¿Por qué?'),
('S1M07', 'Forgotten Branch', 'OSINT', 'Easy', 50, 1, 'Check the developer repository history.', 'Revisa el histórico del repo del desarrollador.'),
('S1M08', 'Buffer Intro', 'Pwn', 'Medium', 200, 1, 'Overwrite the return address.', 'Sobrescribe la dirección de retorno.'),
('S1M09', 'Union Base', 'Web', 'Medium', 200, 1, 'Extract data from the database.', 'Extrae datos de la DB.'),
('S1M10', 'Vigenere Revenge', 'Crypto', 'Medium', 150, 1, 'Key is BR34K.', 'La clave es BR34K.'),
('S1M11', 'Meta Geo', 'Forensics', 'Easy', 100, 1, 'Where was this photo taken?', '¿Dónde se tomó esta foto?'),
('S1M12', 'Tasty Cookie', 'Web', 'Medium', 150, 1, 'Cookies are delicious but dangerous.', 'Las cookies son ricas pero peligrosas.'),
('S1M13', 'Null JWT', 'Web', 'Hard', 300, 1, 'The server trusts the none algorithm.', 'El servidor confía en el algoritmo none.'),
('S1M14', 'ELF Grep', 'Rev', 'Easy', 100, 1, 'Find the flag inside the compiled binary.', 'Halla la flag en el binario compilado.'),
('S1M15', 'Cmd Inject v2', 'Web', 'Medium', 250, 1, 'They added a filter, but you can bypass it.', 'Añadieron un filtro, pero puedes saltarlo.'),
('S1M16', 'Wave Seeker', 'Forensics', 'Medium', 200, 1, 'Listen carefully or look at the spectrograph.', 'Escucha bien o mira el espectrograma.'),
('S1M17', 'XOR Loop', 'Rev', 'Hard', 400, 1, 'The program XORs each byte with a key.', 'El programa hace XOR con cada byte.'),
('S1M18', 'S3 Leak', 'OSINT', 'Medium', 200, 1, 'Explore the open storage buckets.', 'Explora los buckets abiertos.'),
('S1M19', 'TXT Records', 'Forensics', 'Easy', 100, 1, 'Check the DNS records for the domain.', 'Revisa los registros DNS del dominio.'),
('S1M20', 'Format String v2', 'Pwn', 'Hard', 500, 1, 'Advanced format string exploitation.', 'Explotación avanzada de format string.'),
('S1M21', 'Zip Recursion', 'Forensics', 'Medium', 250, 1, 'It is zips all the way down.', 'Son zips hasta el fondo.'),
('S1M22', 'The Final Link', 'Web', 'Insane', 1000, 1, 'Reach the local metadata service.', 'Llega al servicio de metadatos local.')
ON CONFLICT (id) DO UPDATE SET 
  season_id = EXCLUDED.season_id,
  description_en = EXCLUDED.description_en,
  description_es = EXCLUDED.description_es,
  points = EXCLUDED.points,
  category = EXCLUDED.category,
  difficulty = EXCLUDED.difficulty;

-- Challenge Secrets
INSERT INTO public.challenge_secrets (id, flag_hash) VALUES
('S1M01', '8b74e68527957e83169456bbd1932b927a0dca4232995f2fd19f9c3d510b2e73'), -- bxf{r0b0ts_4re_n0t_h3lpful}
('S1M02', '7120b1dbe04b99c52c1e054259274ed7a4f3daac3527631ab881c424e23eb738'), -- bxf{rot13_is_classic}
('S1M03', '0bcc508487ee3fce5d053e01b33003680d2cc89bfb76df0fd7072bf0f44c6e5a'), -- bxf{inspect_element_is_powerful}
('S1M04', '2ae01cd40b526e3edb54adae382c7ba725a934d2ac31ba4d78c039ca604165c8'), -- bxf{h34d3rs_can_b3_trust3d?}
('S1M05', 'cfb03b11c38bcfc581250d44ebb0351602856216329f602a83bd3e8eaef5f26c'), -- bxf{st3g0_1n_plain_s1ght}
('S1M06', '6e92f6865f76c0a4dcb1e7b75b65ea1520ee146ee0a9da4c4eb423e9cf60e2b2'), -- bxf{mag1c_byt3s_n3v3r_l1e}
('S1M07', 'afa2496feefc01c7b4916acb9f72f77664528b7ad9c0319bdf6d596f0f24d534'), -- bxf{g1t_h1st0ry_n3v3r_f0rg3ts}
('S1M08', '2b83eb921151a2d391821ad5725d5f922452d1620fc2b244fb8cb865a21f2cdf'), -- bxf{r3turn_addre55_h1jack3d}
('S1M09', '37c6cd8310f20b0db55dcda20be790eb5d730b5d677e93758691be3456f1eb37'), -- bxf{un10n_bas3d_leak}
('S1M10', 'a439263676311569ff21ed955fcc4a11f0e021b88f3c65c01ca2beaaa685f46d'), -- bxf{v1g3n3r3_1s_n0t_3n0ugh}
('S1M11', '4ca22cabb7e08fcc9a35d6a144a32b379aa1e781ed559f7375816727faa98ddb'), -- bxf{gps_exif_data_found}
('S1M12', '485d1c304881171c6a6e207b5edb9b6be9e2edea216a5b689dac98b501cd6991'), -- bxf{c00k13_m0nster_appr0ves}
('S1M13', '23afe9c6daaf94ef4813536501a2bfbe751d50aef787a5b86ca2f59fdcb28945'), -- bxf{jwt_n0ne_is_danger0us}
('S1M14', '9a51e3200905ee8b55371402a4f454b909c4a796812850b00107cafb4610b64a'), -- bxf{str1ngs_found_1n_elf}
('S1M15', 'e55ec40b538ee959b05b1ef28612d61a22871f52d64e8ee98625ced59c38a9e8'), -- bxf{rce_w1thout_spac3s}
('S1M16', 'be833c34cecdbcda352e014823bdca7084db54b1c7d73386a1ee225b3a3101b3'), -- bxf{audi0_spectr0graph_h1nts}
('S1M17', '62be5970c69256de18688750d56ddbe50b8e372290aaa5823140633c6f67e5c1'), -- bxf{xor_loop_decrypted}
('S1M18', 'a35b6b5cc846595c266af0a6cb680a953138e43ddbf69c2a1b7fc538807daef4'), -- bxf{s3_buckets_must_be_private}
('S1M19', '193f78e0df4eafaad5b18d13e21ac7d6d76385d49f38cad30fd1dd5802b16057'), -- bxf{dns_txt_record_secret}
('S1M20', '6e74ec45140ffc3696ab504c6b5b263d3b7f9a0c4d6d15c5d2be31c9fcee1119'), -- bxf{fmt_strING_WR1TE_4NYWHERE}
('S1M21', '7bbe1a7e86829e01951b6b54b320eb8555610a1f5e5cb3ac7bf9799f6ca46c88'), -- bxf{z1p_bomb_traversa1}
('S1M22', '49044afc17043fa73abc058764e69ea11f379dc76aa1b8df6ad849ff05cc216b')  -- bxf{metadata_imds_v1_leak}
ON CONFLICT (id) DO UPDATE SET flag_hash = EXCLUDED.flag_hash;

-- 7. Social Table Restoration
CREATE TABLE IF NOT EXISTS public.friendships (
  id BIGSERIAL PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id)
);
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parties see their friendships" ON public.friendships;
CREATE POLICY "Parties see their friendships" ON public.friendships FOR SELECT USING (auth.uid() IN (requester_id, addressee_id));

DROP POLICY IF EXISTS "Auth users can send friend requests" ON public.friendships;
CREATE POLICY "Auth users can send friend requests"
ON public.friendships
FOR INSERT
WITH CHECK (
  auth.uid() = requester_id
  AND requester_id <> addressee_id
);

DROP POLICY IF EXISTS "Parties can delete/update friendships" ON public.friendships;
DROP POLICY IF EXISTS "Addressee can update request status" ON public.friendships;
CREATE POLICY "Addressee can update request status"
ON public.friendships
FOR UPDATE
USING (auth.uid() = addressee_id)
WITH CHECK (
  auth.uid() = addressee_id
  AND status IN ('accepted', 'declined', 'blocked')
);

DROP POLICY IF EXISTS "Parties can delete friendships" ON public.friendships;
CREATE POLICY "Parties can delete friendships"
ON public.friendships
FOR DELETE
USING (auth.uid() IN (requester_id, addressee_id));

CREATE TABLE IF NOT EXISTS public.messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ DEFAULT NULL
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants see messages" ON public.messages;
CREATE POLICY "Participants see messages" ON public.messages FOR SELECT USING (auth.uid() IN (sender_id, receiver_id));

DROP POLICY IF EXISTS "Participants can insert messages" ON public.messages;
CREATE POLICY "Participants can insert messages"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (
        (f.requester_id = sender_id AND f.addressee_id = receiver_id)
        OR
        (f.requester_id = receiver_id AND f.addressee_id = sender_id)
      )
  )
);

DROP POLICY IF EXISTS "Participants can mark as read" ON public.messages;
CREATE POLICY "Participants can mark as read" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Realtime Publication Enablement
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'friendships') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
  END IF;
END $$;

-- 8. Social RPC Functions (REMOVED DUPLICATES - Consolidated in Section 5)
-- respond_friend_request and send_message are already defined above.

-- 9. Automations (Profile Creation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, split_part(new.email, '@', 1));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure idempotency by dropping first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 10. PLATFORM V2 (CTF + LEARN) - RESET TOTAL READY
CREATE TABLE IF NOT EXISTS public.tracks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.tracks (id, name, is_active)
VALUES
  ('ctf', 'CTF Missions', TRUE),
  ('learn', 'Learn Labs', TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active;

CREATE TABLE IF NOT EXISTS public.seasons_v2 (
  id SERIAL PRIMARY KEY,
  track_id TEXT NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (track_id, name)
);

ALTER TABLE public.seasons_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Seasons v2 viewable by everyone" ON public.seasons_v2;
CREATE POLICY "Seasons v2 viewable by everyone" ON public.seasons_v2 FOR SELECT USING (true);

INSERT INTO public.seasons_v2 (id, track_id, name, description, is_active, sort_order)
VALUES
  (100, 'ctf', 'Season V2 - Core Ops', 'Core offensive/defensive chain', TRUE, 1),
  (101, 'learn', 'Learn V2 - Operator Bootcamp', 'Hands-on Linux and security workflow training', TRUE, 1)
ON CONFLICT (id) DO UPDATE SET
  track_id = EXCLUDED.track_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS public.challenges_v2 (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  season_id INTEGER NOT NULL REFERENCES public.seasons_v2(id) ON DELETE CASCADE,
  title_en TEXT NOT NULL,
  title_es TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_es TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'insane')),
  points INTEGER NOT NULL CHECK (points > 0),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.challenges_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Challenges v2 viewable by everyone" ON public.challenges_v2;
CREATE POLICY "Challenges v2 viewable by everyone" ON public.challenges_v2 FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.challenge_assets_v2 (
  id BIGSERIAL PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES public.challenges_v2(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('file', 'url', 'terminal_lesson', 'instructions')),
  label TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  order_index INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.challenge_assets_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Assets v2 viewable by everyone" ON public.challenge_assets_v2;
CREATE POLICY "Assets v2 viewable by everyone" ON public.challenge_assets_v2 FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.challenge_validators_v2 (
  challenge_id TEXT PRIMARY KEY REFERENCES public.challenges_v2(id) ON DELETE CASCADE,
  validator_type TEXT NOT NULL CHECK (validator_type IN ('flag_exact', 'flag_regex', 'learn_terminal_marker')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.challenge_validators_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Validators v2 hidden from clients" ON public.challenge_validators_v2;
CREATE POLICY "Validators v2 hidden from clients" ON public.challenge_validators_v2 FOR SELECT USING (false);

CREATE TABLE IF NOT EXISTS public.challenge_attempts_v2 (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL REFERENCES public.challenges_v2(id) ON DELETE CASCADE,
  submitted_value TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.challenge_attempts_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own attempts v2" ON public.challenge_attempts_v2;
CREATE POLICY "Users see own attempts v2" ON public.challenge_attempts_v2 FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "No direct insert attempts v2" ON public.challenge_attempts_v2;
CREATE POLICY "No direct insert attempts v2" ON public.challenge_attempts_v2 FOR INSERT WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.challenge_solves_v2 (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL REFERENCES public.challenges_v2(id) ON DELETE CASCADE,
  points_awarded INTEGER NOT NULL,
  solved_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, challenge_id)
);

ALTER TABLE public.challenge_solves_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own solves v2" ON public.challenge_solves_v2;
CREATE POLICY "Users see own solves v2" ON public.challenge_solves_v2 FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "No direct insert solves v2" ON public.challenge_solves_v2;
CREATE POLICY "No direct insert solves v2" ON public.challenge_solves_v2 FOR INSERT WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.learn_progress_v2 (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL REFERENCES public.challenges_v2(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completion_pct INTEGER NOT NULL DEFAULT 0 CHECK (completion_pct BETWEEN 0 AND 100),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (user_id, challenge_id)
);

ALTER TABLE public.learn_progress_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own learn progress v2" ON public.learn_progress_v2;
CREATE POLICY "Users see own learn progress v2" ON public.learn_progress_v2 FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "No direct write learn progress v2" ON public.learn_progress_v2;
CREATE POLICY "No direct write learn progress v2" ON public.learn_progress_v2 FOR INSERT WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.learn_sessions_v2 (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL REFERENCES public.challenges_v2(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.learn_sessions_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own learn sessions v2" ON public.learn_sessions_v2;
CREATE POLICY "Users see own learn sessions v2" ON public.learn_sessions_v2 FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "No direct insert learn sessions v2" ON public.learn_sessions_v2;
CREATE POLICY "No direct insert learn sessions v2" ON public.learn_sessions_v2 FOR INSERT WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.points_ledger_v2 (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id TEXT REFERENCES public.challenges_v2(id) ON DELETE SET NULL,
  delta INTEGER NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.points_ledger_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own ledger v2" ON public.points_ledger_v2;
CREATE POLICY "Users see own ledger v2" ON public.points_ledger_v2 FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "No direct write ledger v2" ON public.points_ledger_v2;
CREATE POLICY "No direct write ledger v2" ON public.points_ledger_v2 FOR INSERT WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.reset_events_v2 (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('all', 'ctf', 'learn')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reset_events_v2 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own reset events v2" ON public.reset_events_v2;
CREATE POLICY "Users see own reset events v2" ON public.reset_events_v2 FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "No direct write reset events v2" ON public.reset_events_v2;
CREATE POLICY "No direct write reset events v2" ON public.reset_events_v2 FOR INSERT WITH CHECK (false);

-- V2 RPC: catalog with assets
CREATE OR REPLACE FUNCTION public.get_catalog(p_track TEXT DEFAULT NULL, p_season_id INTEGER DEFAULT NULL)
RETURNS TABLE (
  id TEXT,
  track_id TEXT,
  season_id INTEGER,
  title_en TEXT,
  title_es TEXT,
  description_en TEXT,
  description_es TEXT,
  category TEXT,
  difficulty TEXT,
  points INTEGER,
  sort_order INTEGER,
  assets JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id, c.track_id, c.season_id, c.title_en, c.title_es, c.description_en, c.description_es,
    c.category, c.difficulty, c.points, c.sort_order,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'asset_type', a.asset_type,
            'label', a.label,
            'payload', a.payload,
            'order_index', a.order_index
          )
          ORDER BY a.order_index ASC
        )
        FROM public.challenge_assets_v2 a
        WHERE a.challenge_id = c.id
      ),
      '[]'::jsonb
    ) AS assets
  FROM public.challenges_v2 c
  WHERE c.status = 'published'
    AND (p_track IS NULL OR c.track_id = p_track)
    AND (p_season_id IS NULL OR c.season_id = p_season_id)
  ORDER BY c.season_id ASC, c.sort_order ASC;
$$;

-- V2 RPC: per-user progress
CREATE OR REPLACE FUNCTION public.get_user_progress(p_track TEXT DEFAULT NULL)
RETURNS TABLE (
  challenge_id TEXT,
  track_id TEXT,
  solved BOOLEAN,
  solved_at TIMESTAMPTZ,
  points_awarded INTEGER,
  learn_status TEXT,
  completion_pct INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id AS challenge_id,
    c.track_id,
    (s.challenge_id IS NOT NULL) AS solved,
    s.solved_at,
    COALESCE(s.points_awarded, 0) AS points_awarded,
    COALESCE(lp.status, 'not_started') AS learn_status,
    COALESCE(lp.completion_pct, 0) AS completion_pct
  FROM public.challenges_v2 c
  LEFT JOIN public.challenge_solves_v2 s ON s.challenge_id = c.id AND s.user_id = auth.uid()
  LEFT JOIN public.learn_progress_v2 lp ON lp.challenge_id = c.id AND lp.user_id = auth.uid()
  WHERE c.status = 'published'
    AND (p_track IS NULL OR c.track_id = p_track)
  ORDER BY c.season_id ASC, c.sort_order ASC;
$$;

CREATE OR REPLACE FUNCTION public.start_learn_session(p_challenge_id TEXT)
RETURNS TABLE (
  session_id UUID,
  challenge_id TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.challenges_v2
    WHERE id = p_challenge_id
      AND status = 'published'
      AND track_id = 'learn'
  ) THEN
    RAISE EXCEPTION 'LEARN_CHALLENGE_NOT_FOUND';
  END IF;

  v_expires_at := NOW() + INTERVAL '45 minutes';

  INSERT INTO public.learn_sessions_v2 (user_id, challenge_id, expires_at)
  VALUES (auth.uid(), p_challenge_id, v_expires_at)
  RETURNING public.learn_sessions_v2.session_id INTO v_session_id;

  RETURN QUERY SELECT v_session_id, p_challenge_id, v_expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_challenge(
  p_challenge_id TEXT,
  p_payload TEXT,
  p_session_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_track TEXT;
  v_points INTEGER;
  v_validator_type TEXT;
  v_config JSONB;
  v_success BOOLEAN := FALSE;
  v_already_solved BOOLEAN := FALSE;
  v_pattern TEXT;
  v_marker TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'NOT_AUTHENTICATED');
  END IF;

  SELECT c.track_id, c.points, v.validator_type, v.config
  INTO v_track, v_points, v_validator_type, v_config
  FROM public.challenges_v2 c
  JOIN public.challenge_validators_v2 v ON v.challenge_id = c.id
  WHERE c.id = p_challenge_id
    AND c.status = 'published';

  IF v_track IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'CHALLENGE_NOT_FOUND');
  END IF;

  INSERT INTO public.challenge_attempts_v2 (user_id, challenge_id, submitted_value, success)
  VALUES (auth.uid(), p_challenge_id, p_payload, false);

  IF v_validator_type = 'flag_exact' THEN
    v_success := p_payload = COALESCE(v_config->>'value', '');
  ELSIF v_validator_type = 'flag_regex' THEN
    v_pattern := COALESCE(v_config->>'pattern', '');
    IF v_pattern <> '' THEN
      v_success := p_payload ~ v_pattern;
    END IF;
  ELSIF v_validator_type = 'learn_terminal_marker' THEN
    v_marker := COALESCE(v_config->>'marker', '');
    IF p_session_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'LEARN_SESSION_REQUIRED');
    END IF;
    IF NOT EXISTS (
      SELECT 1
      FROM public.learn_sessions_v2 ls
      WHERE ls.session_id = p_session_id
        AND ls.user_id = auth.uid()
        AND ls.challenge_id = p_challenge_id
        AND ls.is_closed = false
        AND ls.expires_at > NOW()
    ) THEN
      RETURN jsonb_build_object('success', false, 'message', 'INVALID_LEARN_SESSION');
    END IF;
    v_success := p_payload = v_marker;
  END IF;

  UPDATE public.challenge_attempts_v2
  SET success = v_success
  WHERE id = (
    SELECT id
    FROM public.challenge_attempts_v2
    WHERE user_id = auth.uid()
      AND challenge_id = p_challenge_id
    ORDER BY created_at DESC
    LIMIT 1
  );

  IF NOT v_success THEN
    RETURN jsonb_build_object('success', false, 'message', 'INVALID_SUBMISSION');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.challenge_solves_v2
    WHERE user_id = auth.uid()
      AND challenge_id = p_challenge_id
  ) INTO v_already_solved;

  IF v_already_solved THEN
    RETURN jsonb_build_object('success', false, 'message', 'ALREADY_SOLVED');
  END IF;

  INSERT INTO public.challenge_solves_v2 (user_id, challenge_id, points_awarded)
  VALUES (auth.uid(), p_challenge_id, v_points);

  INSERT INTO public.points_ledger_v2 (user_id, challenge_id, delta, source)
  VALUES (auth.uid(), p_challenge_id, v_points, 'challenge_solve');

  IF v_track = 'learn' THEN
    INSERT INTO public.learn_progress_v2 (user_id, challenge_id, status, completion_pct, completed_at, last_activity_at, evidence)
    VALUES (auth.uid(), p_challenge_id, 'completed', 100, NOW(), NOW(), jsonb_build_object('marker', p_payload))
    ON CONFLICT (user_id, challenge_id)
    DO UPDATE SET
      status = 'completed',
      completion_pct = 100,
      completed_at = NOW(),
      last_activity_at = NOW(),
      evidence = jsonb_build_object('marker', p_payload);

    IF p_session_id IS NOT NULL THEN
      UPDATE public.learn_sessions_v2
      SET is_closed = true
      WHERE session_id = p_session_id
        AND user_id = auth.uid();
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'SOLVED', 'points_earned', v_points);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_leaderboard_v2(p_track TEXT DEFAULT 'ctf')
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  points BIGINT,
  rank_position BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH scores AS (
    SELECT
      l.user_id,
      SUM(l.delta)::BIGINT AS points,
      MAX(l.created_at) AS last_event
    FROM public.points_ledger_v2 l
    JOIN public.challenges_v2 c ON c.id = l.challenge_id
    WHERE (p_track IS NULL OR c.track_id = p_track)
    GROUP BY l.user_id
  )
  SELECT
    s.user_id,
    p.username,
    p.avatar_url,
    s.points,
    ROW_NUMBER() OVER (ORDER BY s.points DESC, s.last_event ASC) AS rank_position
  FROM scores s
  JOIN public.profiles p ON p.id = s.user_id
  ORDER BY rank_position ASC;
$$;

CREATE OR REPLACE FUNCTION public.reset_total(p_scope TEXT DEFAULT 'all')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scope TEXT := LOWER(COALESCE(p_scope, 'all'));
  v_deleted_attempts BIGINT := 0;
  v_deleted_solves BIGINT := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  IF v_scope NOT IN ('all', 'ctf', 'learn') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_SCOPE');
  END IF;

  IF v_scope IN ('all', 'ctf') THEN
    DELETE FROM public.challenge_attempts_v2 ca
    USING public.challenges_v2 c
    WHERE ca.user_id = auth.uid()
      AND ca.challenge_id = c.id
      AND c.track_id = 'ctf';
    GET DIAGNOSTICS v_deleted_attempts = ROW_COUNT;

    DELETE FROM public.challenge_solves_v2 cs
    USING public.challenges_v2 c
    WHERE cs.user_id = auth.uid()
      AND cs.challenge_id = c.id
      AND c.track_id = 'ctf';
    GET DIAGNOSTICS v_deleted_solves = ROW_COUNT;
  END IF;

  IF v_scope IN ('all', 'learn') THEN
    DELETE FROM public.challenge_attempts_v2 ca
    USING public.challenges_v2 c
    WHERE ca.user_id = auth.uid()
      AND ca.challenge_id = c.id
      AND c.track_id = 'learn';
    GET DIAGNOSTICS v_deleted_attempts = v_deleted_attempts + ROW_COUNT;

    DELETE FROM public.challenge_solves_v2 cs
    USING public.challenges_v2 c
    WHERE cs.user_id = auth.uid()
      AND cs.challenge_id = c.id
      AND c.track_id = 'learn';
    GET DIAGNOSTICS v_deleted_solves = v_deleted_solves + ROW_COUNT;

    DELETE FROM public.learn_progress_v2
    WHERE user_id = auth.uid();

    DELETE FROM public.learn_sessions_v2
    WHERE user_id = auth.uid();
  END IF;

  DELETE FROM public.points_ledger_v2
  WHERE user_id = auth.uid();

  INSERT INTO public.reset_events_v2 (user_id, scope)
  VALUES (auth.uid(), v_scope);

  RETURN jsonb_build_object(
    'ok', true,
    'scope', v_scope,
    'deleted_attempts', v_deleted_attempts,
    'deleted_solves', v_deleted_solves
  );
END;
$$;

-- Seed V2 catalog (MVP 12)
INSERT INTO public.challenges_v2 (
  id, track_id, season_id, title_en, title_es, description_en, description_es,
  category, difficulty, points, status, sort_order, metadata
) VALUES
  ('CTF-001', 'ctf', 100, 'Ghost Endpoint Reborn', 'Endpoint Fantasma Renacido', 'Recover leaked debug payload from legacy route.', 'Recupera el payload de depuración filtrado en una ruta legacy.', 'Web', 'easy', 80, 'published', 1, '{"team":"red"}'),
  ('CTF-002', 'ctf', 100, 'Header Masquerade', 'Mascarada de Cabeceras', 'Bypass role checks using trusted headers.', 'Evita controles de rol usando cabeceras confiables.', 'Web', 'easy', 90, 'published', 2, '{"team":"red"}'),
  ('CTF-003', 'ctf', 100, 'Token Fracture', 'Fractura de Token', 'Exploit weak token validation path.', 'Explota una ruta débil de validación de tokens.', 'Web', 'medium', 150, 'published', 3, '{"team":"red"}'),
  ('CTF-004', 'ctf', 100, 'Traversal Echo', 'Eco de Traversal', 'Read a forbidden file through path confusion.', 'Lee un archivo prohibido por confusión de rutas.', 'Web', 'medium', 160, 'published', 4, '{"team":"red"}'),
  ('CTF-005', 'ctf', 100, 'NoSQL Spiral', 'Espiral NoSQL', 'Break auth logic with JSON operators.', 'Rompe la lógica de autenticación con operadores JSON.', 'Web', 'hard', 260, 'published', 5, '{"team":"red"}'),
  ('CTF-006', 'ctf', 100, 'Metadata Pivot', 'Pivot de Metadatos', 'Reach internal metadata context safely.', 'Alcanza el contexto de metadatos internos de forma segura.', 'Web', 'hard', 320, 'published', 6, '{"team":"red"}'),
  ('CTF-007', 'ctf', 100, 'Packet Cipher', 'Cifrado de Paquetes', 'Extract hidden key from packet dump.', 'Extrae una clave oculta de un volcado de paquetes.', 'Forensics', 'medium', 180, 'published', 7, '{"team":"red"}'),
  ('CTF-008', 'ctf', 100, 'Reverse Pulse', 'Pulso Reverso', 'Patch binary checks to reveal target value.', 'Parchea validaciones de binario para revelar el valor objetivo.', 'Rev', 'hard', 280, 'published', 8, '{"team":"red"}'),
  ('LRN-001', 'learn', 101, 'Arch Linux Essentials', 'Fundamentos de Arch Linux', 'Complete shell basics and package operations.', 'Completa fundamentos de shell y operaciones de paquetes.', 'Learn', 'easy', 60, 'published', 1, '{"lesson":"LX-INTRO"}'),
  ('LRN-002', 'learn', 101, 'Bash Automation', 'Automatización Bash', 'Build scripts for repeatable operations.', 'Construye scripts para operaciones repetibles.', 'Learn', 'easy', 70, 'published', 2, '{"lesson":"BA-CORE"}'),
  ('LRN-003', 'learn', 101, 'Networking Drill', 'Drill de Networking', 'Inspect sockets, routes and DNS traces.', 'Inspecciona sockets, rutas y trazas DNS.', 'Learn', 'medium', 90, 'published', 3, '{"lesson":"NW-DRILL"}'),
  ('LRN-004', 'learn', 101, 'Incident Triage', 'Triage de Incidentes', 'Collect host evidence and isolate anomaly.', 'Recolecta evidencia del host y aísla una anomalía.', 'Learn', 'medium', 100, 'published', 4, '{"lesson":"IR-TRIAGE"}')
ON CONFLICT (id) DO UPDATE SET
  track_id = EXCLUDED.track_id,
  season_id = EXCLUDED.season_id,
  title_en = EXCLUDED.title_en,
  title_es = EXCLUDED.title_es,
  description_en = EXCLUDED.description_en,
  description_es = EXCLUDED.description_es,
  category = EXCLUDED.category,
  difficulty = EXCLUDED.difficulty,
  points = EXCLUDED.points,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order,
  metadata = EXCLUDED.metadata;

INSERT INTO public.challenge_assets_v2 (challenge_id, asset_type, label, payload, order_index)
VALUES
  ('CTF-001', 'instructions', 'Briefing', '{"hint":"Probe debug and backup routes carefully."}', 1),
  ('CTF-003', 'url', 'Auth API', '{"endpoint":"/api/v2/platform/health"}', 1),
  ('CTF-007', 'file', 'capture.pcap', '{"path":"/assets/challenges-v2/CTF-007/capture.pcap"}', 1),
  ('CTF-008', 'file', 'pulse.bin', '{"path":"/assets/challenges-v2/CTF-008/pulse.bin"}', 1),
  ('LRN-001', 'terminal_lesson', 'Lesson', '{"module":"LX-INTRO"}', 1),
  ('LRN-002', 'terminal_lesson', 'Lesson', '{"module":"BA-CORE"}', 1),
  ('LRN-003', 'terminal_lesson', 'Lesson', '{"module":"NW-DRILL"}', 1),
  ('LRN-004', 'terminal_lesson', 'Lesson', '{"module":"IR-TRIAGE"}', 1)
ON CONFLICT DO NOTHING;

INSERT INTO public.challenge_validators_v2 (challenge_id, validator_type, config)
VALUES
  ('CTF-001', 'flag_exact', '{"value":"bxf{ghost_endpoint_reborn}"}'),
  ('CTF-002', 'flag_exact', '{"value":"bxf{header_masquerade_chain}"}'),
  ('CTF-003', 'flag_regex', '{"pattern":"^bxf\\{token_fracture_[a-z0-9_]+\\}$"}'),
  ('CTF-004', 'flag_exact', '{"value":"bxf{traversal_echo_master}"}'),
  ('CTF-005', 'flag_exact', '{"value":"bxf{nosql_spiral_break}"}'),
  ('CTF-006', 'flag_exact', '{"value":"bxf{metadata_pivot_path}"}'),
  ('CTF-007', 'flag_exact', '{"value":"bxf{packet_cipher_keyfound}"}'),
  ('CTF-008', 'flag_exact', '{"value":"bxf{reverse_pulse_patch}"}'),
  ('LRN-001', 'learn_terminal_marker', '{"marker":"ARCH_BASICS_DONE"}'),
  ('LRN-002', 'learn_terminal_marker', '{"marker":"BASH_AUTOMATION_DONE"}'),
  ('LRN-003', 'learn_terminal_marker', '{"marker":"NETWORK_DRILL_DONE"}'),
  ('LRN-004', 'learn_terminal_marker', '{"marker":"TRIAGE_DONE"}')
ON CONFLICT (challenge_id) DO UPDATE SET
  validator_type = EXCLUDED.validator_type,
  config = EXCLUDED.config,
  updated_at = NOW();
