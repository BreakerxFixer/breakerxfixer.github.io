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
SET search_path = public
AS $$
  SELECT * FROM public.seasons ORDER BY id ASC;
$$;

-- Predeclare admin tables so leaderboard/support functions compile on fresh installs.
CREATE TABLE IF NOT EXISTS public.admin_handle_allowlist (
  username TEXT PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
        LEFT JOIN public.admin_users au ON au.user_id = p.id
        WHERE au.user_id IS NULL
        -- Tie-breaker: ASC last solve (the one who reached the score sooner wins)
        ORDER BY p.points DESC, (SELECT MAX(solved_at) FROM public.solves WHERE user_id = p.id) ASC NULLS LAST
        LIMIT 100;
    ELSE
        RETURN QUERY
        SELECT p.id, p.username, COALESCE(SUM(c.points), 0)::BIGINT as points, p.avatar_url
        FROM public.profiles p
        LEFT JOIN public.admin_users au ON au.user_id = p.id
        JOIN public.solves s ON s.user_id = p.id
        JOIN public.challenges c ON c.id = s.challenge_id
        WHERE c.season_id = p_season_id
          AND au.user_id IS NULL
        GROUP BY p.id, p.username, p.avatar_url
        -- Tie-breaker: Earlier last solve within season wins
        ORDER BY points DESC, MAX(s.solved_at) ASC
        LIMIT 100;
    END IF;
END;
$$;

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
    LEFT JOIN public.admin_users au ON au.user_id = p.id
    LEFT JOIN bs ON bs.user_id = p.id
    WHERE au.user_id IS NULL
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

            -- Admin solves never claim first blood.
            -- If first blood is currently owned by an admin, first non-admin solve replaces it.
            UPDATE public.challenges c
            SET first_blood_user_id = auth.uid(), first_blood_at = NOW()
            WHERE c.id = challenge_id_param
              AND NOT public.is_admin(auth.uid())
              AND (
                c.first_blood_user_id IS NULL
                OR EXISTS (
                  SELECT 1
                  FROM public.admin_users au
                  WHERE au.user_id = c.first_blood_user_id
                )
              );

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
    
    -- Friends OR admin↔admin internal DM
    IF NOT EXISTS (
        SELECT 1 FROM public.friendships 
        WHERE status = 'accepted' AND 
        ((requester_id = auth.uid() AND addressee_id = p_receiver_id) OR
         (requester_id = p_receiver_id AND addressee_id = auth.uid()))
    ) AND NOT (
        EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
        AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = p_receiver_id)
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
('M01', 'Mission 01: Dead Drop Manifest', 'Web', 'Easy', 75, 0, 'An exposed endpoint leaks the first logistics ledger. Follow the trail without auth.', 'Un endpoint expuesto filtra el primer ledger logistico. Sigue el rastro sin autenticacion.'),
('M02', 'Mission 02: Badge Replay', 'Web', 'Easy', 75, 0, 'A stale session token still unlocks operator routes. Replay it before rotation.', 'Un token de sesion obsoleto aun abre rutas de operador. Reutilizalo antes de la rotacion.'),
('M03', 'Mission 03: Header Masquerade', 'Web', 'Easy', 100, 0, 'The gateway trusts an internal header. Forge identity and enter the staging node.', 'El gateway confia en una cabecera interna. Forja identidad y entra al nodo de staging.'),
('M04', 'Mission 04: Clockwork SQL', 'Web', 'Medium', 200, 0, 'Timed responses reveal blind SQL behavior. Build confidence bit by bit.', 'Respuestas temporizadas revelan SQL ciego. Construye certeza bit a bit.'),
('M05', 'Mission 05: Recursive Local File', 'Web', 'Medium', 200, 0, 'Path filters are naive. Traverse the vault map and recover internal config.', 'Los filtros de ruta son ingenuos. Recorre el mapa del vault y recupera configuracion interna.'),
('M06', 'Mission 06: Proxy of No Return', 'Web', 'Hard', 375, 0, 'An image fetcher can be coerced into server side requests. Reach forbidden metadata.', 'Un fetcher de imagenes puede forzarse a peticiones del lado servidor. Alcanza metadatos prohibidos.'),
('M07', 'Mission 07: Null Signature Choir', 'Web', 'Hard', 375, 0, 'Legacy JWT verification accepts the none algorithm under fallback mode.', 'La verificacion JWT legacy acepta el algoritmo none en modo fallback.'),
('M08', 'Mission 08: Night Shift Queue', 'Web', 'Insane', 900, 0, 'Race two workers against each other and force duplicate payout credits.', 'Haz competir dos workers y fuerza creditos de pago duplicados.'),
('M09', 'Mission 09: Caesar in Static', 'Crypto', 'Easy', 75, 0, 'A low effort substitution cipher hides a dispatch key in plain text.', 'Un cifrado por sustitucion simple oculta una clave de despacho a plena vista.'),
('M10', 'Mission 10: XOR Relay', 'Crypto', 'Medium', 200, 0, 'Recover the repeating XOR key from known protocol structure.', 'Recupera la clave XOR repetida desde la estructura conocida del protocolo.'),
('M11', 'Mission 11: RSA Cracked Ledger', 'Crypto', 'Hard', 375, 0, 'Small primes, big mistake. Factor n and decrypt shipment notes.', 'Primos pequenos, error enorme. Factoriza n y descifra notas de envio.'),
('M12', 'Mission 12: Padding Oracle Storm', 'Crypto', 'Insane', 900, 0, 'CBC error leaks become an oracle. Recover the command packet one block at a time.', 'Los errores CBC se convierten en oraculo. Recupera el paquete bloque a bloque.'),
('M13', 'Mission 13: Stack Warmup', 'Pwn', 'Easy', 100, 0, 'Simple stack overflow with a reachable win function. Control RIP cleanly.', 'Overflow de pila simple con funcion win alcanzable. Controla RIP de forma limpia.'),
('M14', 'Mission 14: Canary Whisper', 'Pwn', 'Medium', 200, 0, 'Leak the canary through format confusion and return safely to shell.', 'Filtra el canary via confusion de formato y retorna seguro a shell.'),
('M15', 'Mission 15: GOT Eclipse', 'Pwn', 'Hard', 375, 0, 'Overwrite a GOT target and redirect execution into your payload path.', 'Sobrescribe un objetivo GOT y redirige ejecucion a tu payload.'),
('M16', 'Mission 16: Heap Cathedral', 'Pwn', 'Insane', 900, 0, 'Abuse allocator metadata to pivot pointers and seize privileged flow.', 'Abusa metadatos del allocator para pivotar punteros y tomar flujo privilegiado.'),
('M17', 'Mission 17: EXIF Breadcrumbs', 'Forensics', 'Easy', 75, 0, 'Image metadata carries location breadcrumbs and operator initials.', 'Los metadatos de imagen guardan migas de ubicacion e iniciales de operador.'),
('M18', 'Mission 18: PCAP Drift', 'Forensics', 'Medium', 200, 0, 'Reassemble fragmented traffic and recover a credential fragment.', 'Reensambla trafico fragmentado y recupera un fragmento de credencial.'),
('M19', 'Mission 19: Audio Ghostline', 'Forensics', 'Hard', 375, 0, 'A spectrogram watermark hides the extraction phrase.', 'Una marca en espectrograma esconde la frase de extraccion.'),
('M20', 'Mission 20: Time Capsule Zip', 'Forensics', 'Insane', 900, 0, 'Recursive archive layers and timestamp clues unlock final artifact.', 'Capas recursivas de archivo y pistas temporales desbloquean el artefacto final.'),
('M21', 'Mission 21: Handle Drift', 'OSINT', 'Easy', 100, 0, 'Track one alias across commit history, mirrors and profile reuse.', 'Rastrea un alias entre commits, espejos y reutilizacion de perfiles.'),
('M22', 'Mission 22: Satellite Delta', 'OSINT', 'Hard', 375, 0, 'Correlate map tiles, sun angle and shadows to geolocate the relay.', 'Correlaciona teselas, angulo solar y sombras para geolocalizar el rele.'),
('S1M01', 'Mission S1-01: Boot Sector Murmur', 'Rev', 'Easy', 75, 1, 'A damaged disk image still boots hidden clues if inspected byte by byte.', 'Una imagen de disco danada aun arranca pistas ocultas si se inspecciona byte a byte.'),
('S1M02', 'Mission S1-02: Obfuscated Courier', 'Rev', 'Medium', 200, 1, 'A courier binary masks constants through simple arithmetic fog.', 'Un binario mensajero enmascara constantes bajo niebla aritmetica simple.'),
('S1M03', 'Mission S1-03: Bytecode Mirage', 'Rev', 'Hard', 375, 1, 'Custom VM bytecode validates a key stream. Reverse opcodes and win.', 'Un bytecode de VM valida una secuencia clave. Revierte opcodes y gana.'),
('S1M04', 'Mission S1-04: Self-Defending Loader', 'Rev', 'Insane', 900, 1, 'Anti-debug and anti-tamper layers guard the final branch.', 'Capas anti-debug y anti-tamper guardan la rama final.'),
('S1M05', 'Mission S1-05: Kernel Log Echo', 'Programming', 'Easy', 75, 1, 'System logs reveal accidental credentials and host transitions.', 'Los logs del sistema revelan credenciales accidentales y saltos de host.'),
('S1M06', 'Mission S1-06: Regex Circuit', 'Programming', 'Medium', 200, 1, 'Build a parser that extracts valid payload records from noisy streams.', 'Construye un parser que extraiga registros validos de flujos con ruido.'),
('S1M07', 'Mission S1-07: Rate-Limit Marathon', 'Programming', 'Hard', 375, 1, 'Automate token rotation to finish challenge rounds within strict windows.', 'Automatiza la rotacion de tokens para completar rondas bajo ventanas estrictas.'),
('S1M08', 'Mission S1-08: Distributed Solver', 'Programming', 'Insane', 900, 1, 'Parallel tasks and retries are required to beat the orchestrator timer.', 'Se requieren tareas paralelas y reintentos para vencer el temporizador del orquestador.'),
('S1M09', 'Mission S1-09: Bus Sniffer', 'Hardware', 'Easy', 100, 1, 'Decode I2C captures and identify the command that unlocks maintenance mode.', 'Decodifica capturas I2C e identifica el comando que desbloquea mantenimiento.'),
('S1M10', 'Mission S1-10: SPI Relay', 'Hardware', 'Medium', 200, 1, 'Recovered SPI traces contain segmented firmware headers.', 'Trazas SPI recuperadas contienen cabeceras segmentadas de firmware.'),
('S1M11', 'Mission S1-11: UART Nightwatch', 'Hardware', 'Hard', 375, 1, 'A serial console challenge leaks privileged mode through timing.', 'Un reto de consola serial filtra modo privilegiado por temporizacion.'),
('S1M12', 'Mission S1-12: FPGA Smoke', 'Hardware', 'Insane', 900, 1, 'Gate level netlists reveal a hidden check path in custom logic.', 'Netlists a nivel compuerta revelan una ruta oculta de verificacion.'),
('S1M13', 'Mission S1-13: Archive of Ghost Accounts', 'OSINT', 'Easy', 75, 1, 'Cross-link public profiles and forgotten mirrors to tie identities.', 'Cruza perfiles publicos y espejos olvidados para unir identidades.'),
('S1M14', 'Mission S1-14: Transit Camera Triangulation', 'OSINT', 'Medium', 200, 1, 'Triangulate route timestamps from open transport feeds.', 'Triangula marcas temporales de ruta usando feeds abiertos de transporte.'),
('S1M15', 'Mission S1-15: Cloud Breadcrumbs', 'OSINT', 'Hard', 375, 1, 'Public bucket metadata and commit leaks converge into one key artifact.', 'Metadatos de bucket publico y fugas en commits convergen en un artefacto clave.'),
('S1M16', 'Mission S1-16: Phantom Persona Engine', 'OSINT', 'Insane', 900, 1, 'Build an attribution graph from scattered traces and dead links.', 'Construye un grafo de atribucion desde trazas dispersas y enlaces muertos.'),
('S1M17', 'Mission S1-17: Honey Endpoint', 'Web', 'Easy', 100, 1, 'A fake service fingerprints your payload style. Blend in to proceed.', 'Un servicio falso perfila tu estilo de payload. Camuflate para avanzar.'),
('S1M18', 'Mission S1-18: Cookie Confession', 'Web', 'Medium', 200, 1, 'Session cookies expose role claims after weak encoding.', 'Las cookies de sesion exponen claims de rol por codificacion debil.'),
('S1M19', 'Mission S1-19: Templating Rift', 'Web', 'Hard', 375, 1, 'Server side template rendering leaks internals under crafted expressions.', 'El render de plantillas del servidor filtra internos con expresiones preparadas.'),
('S1M20', 'Mission S1-20: Multi-Stage Pivot', 'Web', 'Insane', 900, 1, 'Chain auth confusion, SSRF and cache poisoning into final takeover.', 'Encadena confusion de auth, SSRF y poisoning de cache hasta la toma final.'),
('S1M21', 'Mission S1-21: Last Handshake', 'Forensics', 'Hard', 375, 1, 'Recover a sabotaged TLS transcript and identify the rogue cert path.', 'Recupera un transcript TLS saboteado e identifica la ruta de certificado rogue.'),
('S1M22', 'Mission S1-22: Dawn of the Grid', 'Programming', 'Insane', 1000, 1, 'Final raid: correlate all channels and deliver the shutdown phrase.', 'Incursion final: correlaciona todos los canales y entrega la frase de cierre.')
ON CONFLICT (id) DO UPDATE SET 
  season_id = EXCLUDED.season_id,
  description_en = EXCLUDED.description_en,
  description_es = EXCLUDED.description_es,
  points = EXCLUDED.points,
  category = EXCLUDED.category,
  difficulty = EXCLUDED.difficulty;

-- Challenge Secrets
INSERT INTO public.challenge_secrets (id, flag_hash) VALUES
('M01', 'c3a172e160a64d7738d097a4ffc6e33c40fd85834ab5c3b67a6974adc4e3303c'),
('M02', '3ad3b20b579a01280650a4dcb2fb2003b79795b3c2503cd72dc0055f48fdba61'),
('M03', 'c93eefe1b1e9effb891f1c81d9d34ca9f0c943966e73d02950dfe36a7978a5bd'),
('M04', '243dd41246a1a159f7519c2dc8cee417e7f6923b16aeb6cb8fb590e7e5d8835f'),
('M05', '1d4af8327f303ee3b905dbe8010da2a54fe19cd9e7dfaf741e14ab947c872b41'),
('M06', 'f83eafc575c57f5843ec2d9ceb35b60f500dd8bad81baa73d7453f712f9a7515'),
('M07', 'b9d5c6c729cdf21578fabe9e920912fa222048510955c19db59e96dd18ff0a3a'),
('M08', 'e0797462ee27f4a7d19248718536f6ee7690da14932e938a35277572e6f6f096'),
('M09', 'dfe04c071baf80e971404d25242007cfbe9bc1513c2476545acfd9ffda282981'),
('M10', '0622e797c6fca02989411a0b982e2134136155cc7401aac20af61f7040e3c54c'),
('M11', '823a83a869838018c0c649e7db5185e1939ee17b893617d9950e589900db6492'),
('M12', '846002142b8368bbbf17b8e41ee266c79270fc3ce85b25e2356f34ef00127bc3'),
('M13', '3a4a1cebee1fd403803cdf38a8871f32f30c34d61d1be03f813300e084fa0735'),
('M14', 'd6b09bfc24e8eb98fda7938fe4c903b18ce50b0d9aeb3d9add7fe8b5a4073886'),
('M15', '829fffd3ca25035640cf0aac7a2171460e939562e63fccb37229e79aa6c151bf'),
('M16', 'bda714b44c27ec456397281ea683730b849319fd0e6cabe6d85f1e74c23f6229'),
('M17', 'da1b361f53aca02356b1c601da233c8ec83b37ceff85e593ade16fd6a957a7cc'),
('M18', 'bf2b650046079266a4c916d368c76b5f6b6d6e39f071d85e1b8871a807744a82'),
('M19', 'ced506d2588e8072be32193f38bcaee9f4be65218897072977f90ff812c53f78'),
('M20', '83358a394c7ce41b992f09ae85c366c7d6221bee8233c3a8e22f1e792be7f0c0'),
('M21', 'c4a1ab83412bb412d06ef851276345e98801288e39ac2933ccce13fd7edfe85d'),
('M22', 'b61a6c546da2580fbafa7a19af2f697fd2b51d7607c0db6c13a14369d8e2afca'),
('S1M01', 'bc53cc413be0e336579bd2e438dcf5f51fd313cbbbd7aa1377132cc387f58fd9'),
('S1M02', '6ec6341efc2aa850e2f21eb923f7c6d9976091a0f20e3049b552245c68669683'),
('S1M03', '2ae720b3e5ab70a7bf4c6c38631ca94ae5ad35458316edefa4a84572492bd07d'),
('S1M04', 'ab62064ca0b24b4ab7287ea8ef50c50ddeaf020cd2cdd30ebeb3f503a8b1432f'),
('S1M05', 'd593a725af7421cb08ef6af70c6a348f0a95db3fb523337dc615bf5cea02233a'),
('S1M06', '0f0dc1601f963935ad90988cf707fdafe59a1200d8e7805b98a0cd20b82beff3'),
('S1M07', '5844540b87dfcf9ce77e4c7365b1268c59d87b6896ad060cb9d2338dd2a749f1'),
('S1M08', '1bf40b161c59a055245bd014e8ce75fe29f27478698ac9c54ccbf5fe02e8e12d'),
('S1M09', '278ea34032b282faed12f6a38585bc832f578fe364a7ab0a9b3ed159ab20e509'),
('S1M10', '80042d03ad2aa189ecc51133661253c7f650d5ba84b0b6c618ed079dec9ea5e7'),
('S1M11', '238b4489b32fc697e59f3f9e6a41afb3d222d2f49d6b2ea51a9f139962d1d303'),
('S1M12', '3e792b48ff919c152a7126644772c0a3dc94fa54a776ae2d163547b0b1fe5fe9'),
('S1M13', '56cfadfff4f1e37b4971e5f8bfa2692ab89f79755989f6e98d4459f4763ebe3b'),
('S1M14', 'f8027ab0b986786d5d6b3c400f3fa9587e94739b51248399e4bc6e672e6bd22e'),
('S1M15', '3e006254e443ac498c832a04cc064de7ecbbbeb922849b1eb14d00e0be795d3d'),
('S1M16', 'eb14ca5ed6e8a6f2f2edbd566245a52eab21485a0ca4c264010024897a4517d4'),
('S1M17', '1c241725b4f0b18336d86f9377c3848f1fc0aec5d9568f0fd9eccd45893177f1'),
('S1M18', 'a85e6075cefcfdc445541c880b932754dbdc42cb0a1709b39fa0ff3d2e6fc4f4'),
('S1M19', '2b27567194f36bde223234d87d06b2e690c90ec649d15245f8fde03d48e7b1f0'),
('S1M20', '722696c1561fdd5e9963d0ac11d62a49a20601890d8efdb8bfb0021ae5f0f832'),
('S1M21', 'ca4a8bd440f7049f0f12be85d8e6d862cb908300fff4d12d84dc019beafcd167'),
('S1M22', 'f19524b4d379262590dc64a7cdf81a4792813bdf7726f2b70fd3b643403f4215')
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

-- 7.1 Admin Core (secure role model + audit)
CREATE TABLE IF NOT EXISTS public.admin_handle_allowlist (
  username TEXT PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.admin_handle_allowlist (username, is_enabled)
VALUES
  ('K1R0X', TRUE),
  ('0xwinter', TRUE),
  ('areman-05', TRUE)
ON CONFLICT (username) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_users_admin_read" ON public.admin_users;
CREATE POLICY "admin_users_admin_read" ON public.admin_users
FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_admin(p_uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE au.user_id = auth.uid()
  );
$$;

-- Comprueba si otro usuario es admin (para UI de mensajes admin↔admin). SECURITY DEFINER: no filtra por auth.uid().
CREATE OR REPLACE FUNCTION public.is_user_admin(p_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = p_uid);
$$;

DROP FUNCTION IF EXISTS public.admin_bootstrap_from_username();
DROP TRIGGER IF EXISTS trg_admin_bootstrap_profile ON public.profiles;

-- Explicit admin bootstrap only for existing trusted profiles.
INSERT INTO public.admin_users (user_id, granted_by)
SELECT p.id, p.id
FROM public.profiles p
JOIN public.admin_handle_allowlist a
  ON lower(a.username) = lower(p.username)
WHERE a.is_enabled = TRUE
ON CONFLICT (user_id) DO NOTHING;

-- 7.1b Public admin directory + dedicated support channel
CREATE OR REPLACE FUNCTION public.get_public_support_admins()
RETURNS TABLE (
  id UUID,
  username TEXT,
  avatar_url TEXT,
  points BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    p.points::bigint
  FROM public.admin_users au
  JOIN public.profiles p ON p.id = au.user_id
  LEFT JOIN public.admin_handle_allowlist a ON lower(a.username) = lower(p.username)
  WHERE COALESCE(a.is_enabled, TRUE) = TRUE
  ORDER BY
    CASE lower(p.username)
      WHEN 'k1r0x' THEN 1
      WHEN '0xwinter' THEN 2
      WHEN 'areman-05' THEN 3
      ELSE 99
    END,
    lower(p.username);
$$;

CREATE TABLE IF NOT EXISTS public.support_messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_messages_sender_created ON public.support_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_receiver_created ON public.support_messages(receiver_id, created_at DESC);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "support_messages_select" ON public.support_messages;
CREATE POLICY "support_messages_select" ON public.support_messages
FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = receiver_id OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "support_messages_insert" ON public.support_messages;
CREATE POLICY "support_messages_insert" ON public.support_messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id
  AND (
    (NOT public.is_admin(auth.uid()) AND EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = receiver_id))
    OR
    (public.is_admin(auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = receiver_id))
  )
);

CREATE OR REPLACE FUNCTION public.send_support_message(p_admin_id UUID, p_content TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg_id BIGINT;
  v_content TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED');
  END IF;
  IF public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ADMIN_USE_REPLY_RPC');
  END IF;
  IF p_admin_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = p_admin_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ADMIN_NOT_FOUND');
  END IF;
  v_content := trim(COALESCE(p_content, ''));
  IF v_content = '' OR char_length(v_content) > 2000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_CONTENT');
  END IF;

  INSERT INTO public.support_messages (sender_id, receiver_id, content)
  VALUES (auth.uid(), p_admin_id, v_content)
  RETURNING id INTO v_msg_id;

  RETURN jsonb_build_object('ok', true, 'id', v_msg_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reply_support(p_user_id UUID, p_content TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg_id BIGINT;
  v_content TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ADMIN_ONLY');
  END IF;
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'USER_NOT_FOUND');
  END IF;
  v_content := trim(COALESCE(p_content, ''));
  IF v_content = '' OR char_length(v_content) > 2000 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_CONTENT');
  END IF;

  INSERT INTO public.support_messages (sender_id, receiver_id, content)
  VALUES (auth.uid(), p_user_id, v_content)
  RETURNING id INTO v_msg_id;

  RETURN jsonb_build_object('ok', true, 'id', v_msg_id);
END;
$$;

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_audit_admin_only" ON public.admin_audit_log;
CREATE POLICY "admin_audit_admin_only" ON public.admin_audit_log
FOR SELECT USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.admin_log_action(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'ADMIN_ONLY';
  END IF;
  INSERT INTO public.admin_audit_log (actor_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, COALESCE(p_details, '{}'::jsonb));
END;
$$;

-- 7.2 Community writeups moderation hardening
ALTER TABLE public.community_writeups
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_community_writeups_status ON public.community_writeups (status);

DROP POLICY IF EXISTS "community_writeups_select_public" ON public.community_writeups;
CREATE POLICY "community_writeups_select_public" ON public.community_writeups
FOR SELECT USING (
  status = 'approved'
  OR author_id = auth.uid()
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "community_writeups_update_own" ON public.community_writeups;
CREATE POLICY "community_writeups_update_own" ON public.community_writeups
FOR UPDATE USING (author_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (author_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "community_writeups_delete_own" ON public.community_writeups;
CREATE POLICY "community_writeups_delete_own" ON public.community_writeups
FOR DELETE USING (author_id = auth.uid() OR public.is_admin(auth.uid()));

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
    author_id, title, slug, summary, body, difficulty, platform, tags, lang, status
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
    CASE WHEN COALESCE(lower(trim(p_lang)), 'es') = 'en' THEN 'en' ELSE 'es' END,
    'pending'
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id, 'slug', v_slug, 'status', 'pending');
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'SLUG_COLLISION');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_only_moderate_writeup(
  p_writeup_id UUID,
  p_status TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ADMIN_ONLY');
  END IF;
  v_status := lower(trim(COALESCE(p_status, '')));
  IF v_status NOT IN ('approved', 'rejected', 'hidden') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_STATUS');
  END IF;

  UPDATE public.community_writeups
  SET status = v_status,
      reviewed_by = auth.uid(),
      reviewed_at = NOW(),
      moderation_reason = CASE WHEN p_reason IS NULL OR trim(p_reason) = '' THEN NULL ELSE left(trim(p_reason), 500) END,
      updated_at = NOW()
  WHERE id = p_writeup_id;

  PERFORM public.admin_log_action(
    'moderate_writeup',
    'community_writeup',
    p_writeup_id::TEXT,
    jsonb_build_object('status', v_status)
  );
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_only_delete_writeup(p_writeup_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ADMIN_ONLY');
  END IF;

  DELETE FROM public.community_writeups WHERE id = p_writeup_id;
  PERFORM public.admin_log_action('delete_writeup', 'community_writeup', p_writeup_id::TEXT, '{}'::jsonb);
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- 7.3 Dedicated contests (with exclusive challenges)
CREATE TABLE IF NOT EXISTS public.contests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id INTEGER REFERENCES public.seasons(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE CHECK (char_length(slug) BETWEEN 3 AND 80),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  description TEXT,
  mode TEXT NOT NULL DEFAULT 'solo' CHECK (mode IN ('solo', 'team')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'closed', 'archived')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contest_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 160),
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Web',
  difficulty TEXT NOT NULL DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard', 'Insane')),
  points INTEGER NOT NULL CHECK (points > 0),
  position INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (contest_id, code)
);

CREATE TABLE IF NOT EXISTS public.contest_challenge_secrets (
  challenge_id UUID PRIMARY KEY REFERENCES public.contest_challenges(id) ON DELETE CASCADE,
  flag_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.contest_solves (
  id BIGSERIAL PRIMARY KEY,
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.contest_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  points INTEGER NOT NULL CHECK (points >= 0),
  solved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (challenge_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_contests_status_dates ON public.contests (status, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_contest_challenges_contest ON public.contest_challenges (contest_id, position);
CREATE INDEX IF NOT EXISTS idx_contest_solves_contest ON public.contest_solves (contest_id, solved_at DESC);

ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_challenge_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_solves ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contests_public_read" ON public.contests;
CREATE POLICY "contests_public_read" ON public.contests
FOR SELECT USING (status IN ('scheduled', 'active', 'closed', 'archived') OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "contests_admin_write" ON public.contests;
CREATE POLICY "contests_admin_write" ON public.contests
FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "contest_challenges_public_read" ON public.contest_challenges;
CREATE POLICY "contest_challenges_public_read" ON public.contest_challenges
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.contests c
    WHERE c.id = contest_id
      AND (c.status IN ('scheduled', 'active', 'closed', 'archived') OR public.is_admin(auth.uid()))
  )
);
DROP POLICY IF EXISTS "contest_challenges_admin_write" ON public.contest_challenges;
CREATE POLICY "contest_challenges_admin_write" ON public.contest_challenges
FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "contest_secrets_admin_only" ON public.contest_challenge_secrets;
CREATE POLICY "contest_secrets_admin_only" ON public.contest_challenge_secrets
FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "contest_solves_read" ON public.contest_solves;
CREATE POLICY "contest_solves_read" ON public.contest_solves
FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "contest_solves_insert_own" ON public.contest_solves;
CREATE POLICY "contest_solves_insert_own" ON public.contest_solves
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.submit_contest_flag(
  p_contest_id UUID,
  p_challenge_code TEXT,
  p_flag TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_contest public.contests%ROWTYPE;
  v_challenge public.contest_challenges%ROWTYPE;
  v_hash TEXT;
  v_team BIGINT;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  SELECT * INTO v_contest FROM public.contests WHERE id = p_contest_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'CONTEST_NOT_FOUND');
  END IF;

  IF v_contest.status NOT IN ('active', 'closed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'CONTEST_NOT_ACTIVE');
  END IF;

  SELECT * INTO v_challenge
  FROM public.contest_challenges
  WHERE contest_id = p_contest_id
    AND code = upper(trim(COALESCE(p_challenge_code, '')))
    AND is_enabled = TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'CHALLENGE_NOT_FOUND');
  END IF;

  SELECT flag_hash INTO v_hash
  FROM public.contest_challenge_secrets
  WHERE challenge_id = v_challenge.id;

  IF v_hash IS NULL OR crypt(trim(COALESCE(p_flag, '')), v_hash) <> v_hash THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_FLAG');
  END IF;

  IF v_contest.mode = 'team' THEN
    SELECT tm.team_id INTO v_team
    FROM public.team_members tm
    WHERE tm.user_id = v_user
    ORDER BY tm.team_id
    LIMIT 1;
  END IF;

  INSERT INTO public.contest_solves (contest_id, challenge_id, user_id, team_id, points)
  VALUES (p_contest_id, v_challenge.id, v_user, v_team, v_challenge.points)
  ON CONFLICT (challenge_id, user_id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_SOLVED');
  END IF;

  RETURN jsonb_build_object('success', true, 'challenge', v_challenge.code, 'points', v_challenge.points);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_contest_leaderboard(p_contest_id UUID)
RETURNS TABLE (
  entry_type TEXT,
  entry_id TEXT,
  label TEXT,
  points BIGINT,
  solves BIGINT,
  last_solve_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode TEXT;
BEGIN
  SELECT mode INTO v_mode FROM public.contests WHERE id = p_contest_id;
  IF v_mode IS NULL THEN
    RETURN;
  END IF;

  IF v_mode = 'team' THEN
    RETURN QUERY
    SELECT
      'team'::TEXT,
      t.id::TEXT,
      t.name::TEXT,
      COALESCE(SUM(cs.points), 0)::BIGINT,
      COUNT(cs.id)::BIGINT,
      MAX(cs.solved_at)
    FROM public.teams t
    LEFT JOIN public.contest_solves cs ON cs.team_id = t.id AND cs.contest_id = p_contest_id
    GROUP BY t.id, t.name
    HAVING COUNT(cs.id) > 0
    ORDER BY 4 DESC, 6 ASC NULLS LAST;
  ELSE
    RETURN QUERY
    SELECT
      'user'::TEXT,
      p.id::TEXT,
      p.username::TEXT,
      COALESCE(SUM(cs.points), 0)::BIGINT,
      COUNT(cs.id)::BIGINT,
      MAX(cs.solved_at)
    FROM public.profiles p
    LEFT JOIN public.contest_solves cs ON cs.user_id = p.id AND cs.contest_id = p_contest_id
    GROUP BY p.id, p.username
    HAVING COUNT(cs.id) > 0
    ORDER BY 4 DESC, 6 ASC NULLS LAST;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_only_upsert_contest(
  p_id UUID,
  p_season_id INTEGER,
  p_slug TEXT,
  p_title TEXT,
  p_description TEXT,
  p_mode TEXT,
  p_status TEXT,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ADMIN_ONLY');
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.contests (
      season_id, slug, title, description, mode, status, starts_at, ends_at, created_by
    )
    VALUES (
      p_season_id,
      lower(trim(p_slug)),
      left(trim(p_title), 120),
      p_description,
      COALESCE(NULLIF(lower(trim(p_mode)), ''), 'solo'),
      COALESCE(NULLIF(lower(trim(p_status)), ''), 'draft'),
      p_starts_at,
      p_ends_at,
      auth.uid()
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.contests
    SET
      season_id = p_season_id,
      slug = lower(trim(p_slug)),
      title = left(trim(p_title), 120),
      description = p_description,
      mode = COALESCE(NULLIF(lower(trim(p_mode)), ''), mode),
      status = COALESCE(NULLIF(lower(trim(p_status)), ''), status),
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      updated_at = NOW()
    WHERE id = p_id;
    v_id := p_id;
  END IF;

  PERFORM public.admin_log_action('upsert_contest', 'contest', v_id::TEXT, jsonb_build_object('slug', p_slug));
  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_only_upsert_contest_challenge(
  p_id UUID,
  p_contest_id UUID,
  p_code TEXT,
  p_title TEXT,
  p_description TEXT,
  p_category TEXT,
  p_difficulty TEXT,
  p_points INTEGER,
  p_position INTEGER,
  p_flag_plain TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ADMIN_ONLY');
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.contest_challenges (
      contest_id, code, title, description, category, difficulty, points, position
    )
    VALUES (
      p_contest_id,
      upper(trim(p_code)),
      left(trim(p_title), 160),
      p_description,
      left(COALESCE(NULLIF(trim(p_category), ''), 'Web'), 80),
      COALESCE(NULLIF(trim(p_difficulty), ''), 'Medium'),
      GREATEST(1, p_points),
      COALESCE(p_position, 0)
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.contest_challenges
    SET
      code = upper(trim(p_code)),
      title = left(trim(p_title), 160),
      description = p_description,
      category = left(COALESCE(NULLIF(trim(p_category), ''), category), 80),
      difficulty = COALESCE(NULLIF(trim(p_difficulty), ''), difficulty),
      points = GREATEST(1, p_points),
      position = COALESCE(p_position, position)
    WHERE id = p_id;
    v_id := p_id;
  END IF;

  IF p_flag_plain IS NOT NULL AND trim(p_flag_plain) <> '' THEN
    INSERT INTO public.contest_challenge_secrets (challenge_id, flag_hash)
    VALUES (v_id, crypt(trim(p_flag_plain), gen_salt('bf')))
    ON CONFLICT (challenge_id) DO UPDATE SET flag_hash = EXCLUDED.flag_hash;
  END IF;

  PERFORM public.admin_log_action('upsert_contest_challenge', 'contest_challenge', v_id::TEXT, jsonb_build_object('code', p_code));
  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_only_upsert_season(
  p_id INTEGER,
  p_name TEXT,
  p_description TEXT,
  p_is_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id INTEGER;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ADMIN_ONLY');
  END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.seasons (name, description, is_active)
    VALUES (left(trim(p_name), 80), p_description, COALESCE(p_is_active, FALSE))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.seasons
    SET name = left(trim(p_name), 80),
        description = p_description,
        is_active = COALESCE(p_is_active, is_active)
    WHERE id = p_id;
    v_id := p_id;
  END IF;
  PERFORM public.admin_log_action('upsert_season', 'season', v_id::TEXT, jsonb_build_object('name', p_name));
  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_only_upsert_challenge(
  p_id TEXT,
  p_title TEXT,
  p_category TEXT,
  p_difficulty TEXT,
  p_points INTEGER,
  p_season_id INTEGER,
  p_desc_en TEXT,
  p_desc_es TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ADMIN_ONLY');
  END IF;

  INSERT INTO public.challenges (
    id, title, category, difficulty, points, season_id, description_en, description_es
  )
  VALUES (
    upper(trim(p_id)),
    left(trim(p_title), 160),
    left(COALESCE(NULLIF(trim(p_category), ''), 'Web'), 80),
    COALESCE(NULLIF(trim(p_difficulty), ''), 'Medium'),
    GREATEST(1, p_points),
    p_season_id,
    p_desc_en,
    p_desc_es
  )
  ON CONFLICT (id) DO UPDATE
  SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    difficulty = EXCLUDED.difficulty,
    points = EXCLUDED.points,
    season_id = EXCLUDED.season_id,
    description_en = EXCLUDED.description_en,
    description_es = EXCLUDED.description_es;

  PERFORM public.admin_log_action('upsert_challenge', 'challenge', upper(trim(p_id)), jsonb_build_object('title', p_title));
  RETURN jsonb_build_object('ok', true, 'id', upper(trim(p_id)));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_only_set_challenge_flag(
  p_challenge_id TEXT,
  p_flag_plain TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ADMIN_ONLY');
  END IF;
  IF p_flag_plain IS NULL OR trim(p_flag_plain) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'EMPTY_FLAG');
  END IF;
  INSERT INTO public.challenge_secrets (id, flag_hash)
  VALUES (upper(trim(p_challenge_id)), crypt(trim(p_flag_plain), gen_salt('bf')))
  ON CONFLICT (id) DO UPDATE SET flag_hash = EXCLUDED.flag_hash;
  PERFORM public.admin_log_action('set_challenge_flag', 'challenge_secret', upper(trim(p_challenge_id)), '{}'::jsonb);
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_only_delete_contest(p_contest_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ADMIN_ONLY');
  END IF;
  DELETE FROM public.contests WHERE id = p_contest_id;
  PERFORM public.admin_log_action('delete_contest', 'contest', p_contest_id::TEXT, '{}'::jsonb);
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Login brute-force guard (server-side)
CREATE TABLE IF NOT EXISTS public.login_attempt_guard (
  username TEXT PRIMARY KEY,
  fail_count INTEGER NOT NULL DEFAULT 0,
  first_fail_at TIMESTAMPTZ,
  locked_until TIMESTAMPTZ,
  lock_level INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.login_attempt_guard ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_attempt_login(p_username TEXT)
RETURNS TABLE(
  allowed BOOLEAN,
  retry_after_seconds INTEGER,
  attempts_left INTEGER,
  lock_until TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT := lower(trim(COALESCE(p_username, '')));
  v_now TIMESTAMPTZ := now();
  v_fail_count INTEGER := 0;
  v_first_fail_at TIMESTAMPTZ := NULL;
  v_locked_until TIMESTAMPTZ := NULL;
  v_window_mins INTEGER := 10;
  v_max_fails INTEGER := 6;
BEGIN
  IF v_username = '' OR length(v_username) > 64 THEN
    RETURN QUERY SELECT false, 900, 0, v_now + interval '15 minutes';
    RETURN;
  END IF;

  SELECT g.fail_count, g.first_fail_at, g.locked_until
  INTO v_fail_count, v_first_fail_at, v_locked_until
  FROM public.login_attempt_guard g
  WHERE g.username = v_username;

  IF v_locked_until IS NOT NULL AND v_locked_until > v_now THEN
    RETURN QUERY SELECT false, GREATEST(1, EXTRACT(EPOCH FROM (v_locked_until - v_now))::INTEGER), 0, v_locked_until;
    RETURN;
  END IF;

  IF v_first_fail_at IS NULL OR v_first_fail_at <= (v_now - make_interval(mins => v_window_mins)) THEN
    RETURN QUERY SELECT true, 0, v_max_fails, NULL::timestamptz;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 0, GREATEST(0, v_max_fails - v_fail_count), NULL::timestamptz;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_login_attempt(p_username TEXT, p_success BOOLEAN)
RETURNS TABLE(
  allowed BOOLEAN,
  retry_after_seconds INTEGER,
  attempts_left INTEGER,
  lock_until TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT := lower(trim(COALESCE(p_username, '')));
  v_now TIMESTAMPTZ := now();
  v_fail_count INTEGER := 0;
  v_first_fail_at TIMESTAMPTZ := NULL;
  v_locked_until TIMESTAMPTZ := NULL;
  v_lock_level INTEGER := 0;
  v_window_mins INTEGER := 10;
  v_max_fails INTEGER := 6;
  v_lock_minutes INTEGER := 15;
BEGIN
  IF v_username = '' OR length(v_username) > 64 THEN
    RETURN QUERY SELECT false, 900, 0, v_now + interval '15 minutes';
    RETURN;
  END IF;

  IF p_success THEN
    DELETE FROM public.login_attempt_guard WHERE username = v_username;
    RETURN QUERY SELECT true, 0, v_max_fails, NULL::timestamptz;
    RETURN;
  END IF;

  INSERT INTO public.login_attempt_guard(username)
  VALUES (v_username)
  ON CONFLICT (username) DO NOTHING;

  SELECT g.fail_count, g.first_fail_at, g.locked_until, g.lock_level
  INTO v_fail_count, v_first_fail_at, v_locked_until, v_lock_level
  FROM public.login_attempt_guard g
  WHERE g.username = v_username
  FOR UPDATE;

  IF v_locked_until IS NOT NULL AND v_locked_until > v_now THEN
    RETURN QUERY SELECT false, GREATEST(1, EXTRACT(EPOCH FROM (v_locked_until - v_now))::INTEGER), 0, v_locked_until;
    RETURN;
  END IF;

  IF v_first_fail_at IS NULL OR v_first_fail_at <= (v_now - make_interval(mins => v_window_mins)) THEN
    v_fail_count := 0;
    v_first_fail_at := v_now;
  END IF;

  v_fail_count := v_fail_count + 1;

  IF v_fail_count >= v_max_fails THEN
    v_lock_level := LEAST(6, v_lock_level + 1);
    v_lock_minutes := LEAST(240, 15 * (2 ^ GREATEST(0, v_lock_level - 1)));
    v_locked_until := v_now + make_interval(mins => v_lock_minutes);

    UPDATE public.login_attempt_guard
    SET fail_count = 0,
        first_fail_at = NULL,
        locked_until = v_locked_until,
        lock_level = v_lock_level,
        updated_at = v_now
    WHERE username = v_username;

    RETURN QUERY SELECT false, GREATEST(1, EXTRACT(EPOCH FROM (v_locked_until - v_now))::INTEGER), 0, v_locked_until;
    RETURN;
  END IF;

  UPDATE public.login_attempt_guard
  SET fail_count = v_fail_count,
      first_fail_at = v_first_fail_at,
      locked_until = NULL,
      updated_at = v_now
  WHERE username = v_username;

  RETURN QUERY SELECT true, 0, GREATEST(0, v_max_fails - v_fail_count), NULL::timestamptz;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_support_admins() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_support_message(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reply_support(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_attempt_login(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_login_attempt(TEXT, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_contest_flag(UUID, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_contest_leaderboard(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_only_upsert_contest(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_only_upsert_contest_challenge(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_only_upsert_season(INTEGER, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_only_upsert_challenge(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_only_set_challenge_flag(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_only_moderate_writeup(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_only_delete_writeup(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_only_delete_contest(UUID) TO authenticated;

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
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
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
  v_rc BIGINT;
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
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    v_deleted_attempts := v_deleted_attempts + v_rc;

    DELETE FROM public.challenge_solves_v2 cs
    USING public.challenges_v2 c
    WHERE cs.user_id = auth.uid()
      AND cs.challenge_id = c.id
      AND c.track_id = 'learn';
    GET DIAGNOSTICS v_rc = ROW_COUNT;
    v_deleted_solves := v_deleted_solves + v_rc;

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
