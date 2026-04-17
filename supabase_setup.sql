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
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS first_blood_user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS first_blood_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_challenges_first_blood_user ON public.challenges (first_blood_user_id);

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
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2b Leaderboard enriquecido (scopes, momentum, filtros) — ver scratch/leaderboard_v2_migration.sql
CREATE OR REPLACE FUNCTION public._bxf_category_team(cat TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $func$
  SELECT CASE
    WHEN COALESCE(TRIM(cat), '') = '' THEN 'red'
    WHEN TRIM(cat) IN ('Web', 'Pwn', 'Crypto', 'OSINT', 'Programming') THEN 'red'
    WHEN TRIM(cat) IN ('Forensics', 'Reversing', 'Rev', 'Hardware', 'Misc') THEN 'blue'
    WHEN mod(abs(hashtext(TRIM(cat))), 2) = 0 THEN 'red'
    ELSE 'blue'
  END;
$func$;

CREATE OR REPLACE FUNCTION public.get_leaderboard_v2(
  p_season_id INTEGER DEFAULT NULL,
  p_scope TEXT DEFAULT 'global',
  p_category TEXT DEFAULT NULL,
  p_difficulty TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  pts BIGINT,
  avatar_url TEXT,
  flags BIGINT,
  momentum BIGINT,
  last_solve_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $lb2$
DECLARE
  sid INTEGER;
  sc TEXT;
BEGIN
  sid := CASE WHEN p_season_id IS NULL OR p_season_id = -1 THEN NULL ELSE p_season_id END;
  sc := lower(trim(coalesce(p_scope, 'global')));

  IF sc = 'friends' AND auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF sc NOT IN ('global', 'red', 'blue', 'friends') THEN
    sc := 'global';
  END IF;

  RETURN QUERY
  WITH mates AS (
    SELECT DISTINCT CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END AS uid
    FROM public.friendships f
    WHERE f.status = 'accepted'
      AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
    UNION
    SELECT auth.uid()
  ),
  bs AS (
    SELECT
      s.user_id,
      s.solved_at,
      c.points AS ch_pts,
      c.category
    FROM public.solves s
    INNER JOIN public.challenges c ON c.id = s.challenge_id
    WHERE (sid IS NULL OR c.season_id = sid)
      AND (p_category IS NULL OR c.category = p_category)
      AND (p_difficulty IS NULL OR c.difficulty = p_difficulty)
  ),
  ua AS (
    SELECT
      p.id AS pid,
      p.username AS uname,
      p.avatar_url AS av,
      p.points::bigint AS profile_pts,
      COALESCE(SUM(bs.ch_pts), 0)::bigint AS solved_pts,
      COUNT(bs.user_id)::bigint AS flag_n,
      MAX(bs.solved_at) AS last_at,
      COALESCE(SUM(CASE WHEN bs.solved_at > NOW() - INTERVAL '14 days' THEN 1 ELSE 0 END), 0)::bigint AS mom,
      COALESCE(SUM(CASE WHEN public._bxf_category_team(bs.category) = 'red' THEN bs.ch_pts ELSE 0 END), 0)::bigint AS rpt,
      COALESCE(SUM(CASE WHEN public._bxf_category_team(bs.category) = 'blue' THEN bs.ch_pts ELSE 0 END), 0)::bigint AS bpt,
      COALESCE(SUM(CASE WHEN public._bxf_category_team(bs.category) = 'red' THEN 1 ELSE 0 END), 0)::bigint AS rflag,
      COALESCE(SUM(CASE WHEN public._bxf_category_team(bs.category) = 'blue' THEN 1 ELSE 0 END), 0)::bigint AS bflag
    FROM public.profiles p
    LEFT JOIN bs ON bs.user_id = p.id
    GROUP BY p.id, p.username, p.avatar_url, p.points
  ),
  fil AS (
    SELECT
      ua.*,
      CASE
        WHEN sc = 'red' THEN ua.rpt
        WHEN sc = 'blue' THEN ua.bpt
        WHEN sid IS NULL THEN ua.profile_pts
        ELSE ua.solved_pts
      END AS sort_pts,
      CASE
        WHEN sc = 'red' THEN ua.rflag
        WHEN sc = 'blue' THEN ua.bflag
        ELSE ua.flag_n
      END AS out_flags
    FROM ua
    WHERE
      (sc <> 'friends' OR ua.pid IN (SELECT mates.uid FROM mates))
      AND (sid IS NULL OR ua.flag_n > 0)
      AND (
        sc = 'global'
        OR sc = 'friends'
        OR (sc = 'red' AND ua.rpt > 0)
        OR (sc = 'blue' AND ua.bpt > 0)
      )
  )
  SELECT
    fil.pid,
    fil.uname,
    fil.sort_pts,
    fil.av,
    fil.out_flags,
    fil.mom,
    fil.last_at
  FROM fil
  ORDER BY
    fil.sort_pts DESC,
    fil.last_at ASC NULLS LAST
  LIMIT 100;
END;
$lb2$;

-- 5.3 submit_flag (Secure submission + first blood)
CREATE OR REPLACE FUNCTION public.submit_flag(challenge_id_param TEXT, submitted_flag TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    correct_hash TEXT;
    pts_to_add INTEGER;
    already_solved BOOLEAN;
    inserted_solve BOOLEAN;
    fb_rows INTEGER := 0;
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
            UPDATE public.profiles SET points = points + COALESCE(pts_to_add, 0) WHERE id = auth.uid();
            INSERT INTO public.submission_logs (user_id, challenge_id, success) VALUES (auth.uid(), challenge_id_param, true);

            UPDATE public.challenges
            SET first_blood_user_id = auth.uid(), first_blood_at = NOW()
            WHERE id = challenge_id_param AND first_blood_user_id IS NULL;

            GET DIAGNOSTICS fb_rows = ROW_COUNT;

            RETURN jsonb_build_object(
                'success', true,
                'message', 'FLAG_CORRECT',
                'points_earned', pts_to_add,
                'first_blood', fb_rows > 0
            );
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
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
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
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
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
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
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
CREATE POLICY "Auth users can send friend requests" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Parties can delete/update friendships" ON public.friendships;
CREATE POLICY "Parties can delete/update friendships" ON public.friendships FOR ALL USING (auth.uid() IN (requester_id, addressee_id));

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
CREATE POLICY "Participants can insert messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Participants can mark as read" ON public.messages;
CREATE POLICY "Participants can mark as read" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Community writeups (Markdown; public read, own-row write)
CREATE TABLE IF NOT EXISTS public.community_writeups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  slug TEXT NOT NULL UNIQUE CHECK (char_length(slug) BETWEEN 8 AND 120),
  summary TEXT CHECK (summary IS NULL OR char_length(summary) <= 500),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 20 AND 50000),
  difficulty TEXT NOT NULL DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard', 'Insane')),
  platform TEXT NOT NULL DEFAULT 'Other' CHECK (char_length(platform) BETWEEN 1 AND 80),
  tags TEXT[] NOT NULL DEFAULT '{}',
  lang TEXT NOT NULL DEFAULT 'es' CHECK (lang IN ('es', 'en')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_writeups_created ON public.community_writeups (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_writeups_author ON public.community_writeups (author_id);

ALTER TABLE public.community_writeups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "community_writeups_select_public" ON public.community_writeups;
CREATE POLICY "community_writeups_select_public" ON public.community_writeups FOR SELECT USING (true);

DROP POLICY IF EXISTS "community_writeups_insert_own" ON public.community_writeups;
CREATE POLICY "community_writeups_insert_own" ON public.community_writeups FOR INSERT WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "community_writeups_update_own" ON public.community_writeups;
CREATE POLICY "community_writeups_update_own" ON public.community_writeups FOR UPDATE USING (author_id = auth.uid());

DROP POLICY IF EXISTS "community_writeups_delete_own" ON public.community_writeups;
CREATE POLICY "community_writeups_delete_own" ON public.community_writeups FOR DELETE USING (author_id = auth.uid());

CREATE OR REPLACE FUNCTION public.submit_community_writeup(
  p_title TEXT,
  p_summary TEXT,
  p_body TEXT,
  p_difficulty TEXT,
  p_platform TEXT,
  p_tags TEXT[],
  p_lang TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug TEXT;
  v_base TEXT;
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  IF length(trim(COALESCE(p_title, ''))) < 3 OR length(COALESCE(p_body, '')) < 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'VALIDATION');
  END IF;

  v_base := trim(both '-' FROM regexp_replace(lower(trim(p_title)), '[^a-z0-9]+', '-', 'gi'));
  IF v_base = '' THEN
    v_base := 'writeup';
  END IF;
  v_base := left(v_base, 48);
  v_slug := v_base || '-' || substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 10);

  INSERT INTO public.community_writeups (
    author_id, title, slug, summary, body,
    difficulty, platform, tags, lang
  )
  VALUES (
    auth.uid(),
    left(trim(p_title), 200),
    v_slug,
    CASE WHEN trim(COALESCE(p_summary, '')) = '' THEN NULL ELSE left(trim(p_summary), 500) END,
    p_body,
    COALESCE(NULLIF(trim(p_difficulty), ''), 'Medium'),
    left(COALESCE(NULLIF(trim(p_platform), ''), 'Other'), 80),
    COALESCE(p_tags, '{}'),
    CASE WHEN COALESCE(lower(trim(p_lang)), 'es') = 'en' THEN 'en' ELSE 'es' END
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id, 'slug', v_slug);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'SLUG_COLLISION');
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_community_writeup(text, text, text, text, text, text[], text) TO anon, authenticated;

-- Realtime Publication Enablement
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'friendships') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'solves') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.solves;
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
