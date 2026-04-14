-- 🧪 THE BREAKER && THE FIXER - SEASON 1 & SOCIAL FIX
-- PASTE THIS INTO SUPABASE SQL EDITOR

-- 1. Ensure Season 1 exists
INSERT INTO public.seasons (id, name, description, is_active)
VALUES (1, 'Season 1', 'The Expansion Pack', TRUE)
ON CONFLICT (id) DO UPDATE SET is_active = TRUE;

-- 2. New RPC: respond_friend_request
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
        WHERE id = p_friendship_id AND addressee_id = auth.uid();
        RETURN jsonb_build_object('ok', true);
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_ACTION');
END; $$;

-- 3. New RPC: send_message
CREATE OR REPLACE FUNCTION public.send_message(p_receiver_id UUID, p_content TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_msg_id BIGINT;
BEGIN
    IF auth.uid() IS NULL THEN 
        RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED'); 
    END IF;
    
    -- Check if friends (only friends can talk)
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

-- 4. RLS Policies for Social Actions
-- Allow users to send friend requests
DROP POLICY IF EXISTS "Auth users can send friend requests" ON public.friendships;
CREATE POLICY "Auth users can send friend requests" ON public.friendships 
FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Allow users to insert messages (needed even with RPC for the RPC to work as SECURITY DEFINER if calling insert)
DROP POLICY IF EXISTS "Auth users can send messages" ON public.messages;
CREATE POLICY "Auth users can send messages" ON public.messages 
FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- 5. Season 1 Challenges (Definitions)
INSERT INTO public.challenges (id, title, category, difficulty, points, season_id, description_en, description_es) VALUES
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
ON CONFLICT (id) DO NOTHING;

-- 6. Season 1 Secrets (Hashes of bxf{...} flags)
INSERT INTO public.challenge_secrets (id, flag_hash) VALUES
('S1M01', '8b74e68527957e83169456bbd1932b927a0dca4232995f2fd19f9c3d510b2e73'), -- bxf{r0b0ts_4re_n0t_h3lpful}
('S1M02', '7120b1dbe04b99c52c1e054259274ed7a4f3daac3527631ab881c424e23eb738'), -- bxf{rot13_is_classic}
('S1M03', '0bcc508487ee3fce5d053e01b33003680d2cc89bfb76df0fd7072bf0f44c6e5a'), -- bxf{inspect_element_is_powerful}
('S1M04', '2ae01cd40b526e3edb54adae382c7ba725a934d2ac31ba4d78c039ca604165c8'), -- bxf{h34d3rs_can_b3_trust3d?}
('S1M05', 'cfb03b11c38bcfc581250d44ebb0351602856216329f602a83bd3e8eaef5f26c'), -- bxf{st3g0_1n_plain_s1ght}
('S1M06', '6e92f6865f76c0a4dcb1e7b75b65ea1520ee146ee0a9da4c4eb423e9cf60e2b2')  -- bxf{mag1c_byt3s_n3v3r_l1e}
('S1M07', '6a978f85f1c1f6d8958742880789710f63548971167428059871630456187910'), -- dummy hash (placeholder for git history)
('S1M08', 'c16d5671a5c60a28399e51c1f697428399e51c1f697428399e51c1f697428399'), -- dummy hash
('S1M09', 'd16e5671a5c60a28399e51c1f697428399e51c1f697428399e51c1f697428399'), -- dummy hash
('S1M10', 'e16f5671a5c60a28399e51c1f697428399e51c1f697428399e51c1f697428399'), -- dummy hash
('S1M11', 'f1605671a5c60a28399e51c1f697428399e51c1f697428399e51c1f697428399'), -- dummy hash
('S1M12', 'a1615671a5c60a28399e51c1f697428399e51c1f697428399e51c1f697428399'), -- dummy hash
('S1M13', 'b1625671a5c60a28399e51c1f697428399e51c1f697428399e51c1f697428399'), -- dummy hash
('S1M14', 'c1635671a5c60a28399e51c1f697428399e51c1f697428399e51c1f697428399'), -- dummy hash
('S1M15', 'd1645671a5c60a28399e51c1f697428399e51c1f697428399e51c1f697428399'), -- dummy hash
('S1M16', 'e1655671a5c60a28399e51c1f697428399e51c1f697428399e51c1f697428399'), -- dummy hash
('S1M17', 'f1665671a5c60a28399e51c1f697428399e51c1f697428399e51c1f697428399'), -- dummy hash
('S1M18', 'a1675671a5c60a28399e51c1f697428399e51c1f697428399e51c1f697428399'), -- dummy hash
('S1M19', 'b1685671a5c60a28399e51c1f697428399e51c1f697428399e51c1f697428399'), -- dummy hash
('S1M20', 'c1695671a5c60a28399e51c1f697428399e51c1f697428399e51c1f697428399'), -- dummy hash
('S1M21', 'd1605671a5c60a28399e51c1f697428399e51c1f697428399e51c1f697428399'), -- dummy hash
('S1M22', 'e1615671a5c60a28399e51c1f697428399e51c1f697428399e51c1f697428399')  -- dummy hash
ON CONFLICT (id) DO UPDATE SET flag_hash = EXCLUDED.flag_hash;

-- UPDATE: In a real scenario, the user will run this. I will provide it in a clear artifact.
