-- Writeups de comunidad — ejecutar en Supabase SQL Editor
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
