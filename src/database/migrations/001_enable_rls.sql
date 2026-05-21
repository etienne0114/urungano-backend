-- ══════════════════════════════════════════════════════════════════
-- Migration 001 — Enable Row Level Security on all public tables
-- Run this once in the Supabase SQL Editor (or via psql).
-- ══════════════════════════════════════════════════════════════════

-- 1. Enable RLS on every table
ALTER TABLE public.lessons        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debate_votes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anon_questions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- 2. Drop orphaned policy that existed before RLS was switched on
DROP POLICY IF EXISTS "Enable read access for all users" ON public.lessons;

-- ── PUBLIC READ tables (catalogue data) ───────────────────────────
-- lessons
CREATE POLICY "lessons_read"  ON public.lessons FOR SELECT USING (true);
CREATE POLICY "lessons_write" ON public.lessons FOR ALL    USING (current_user = 'postgres');

-- quiz_questions
CREATE POLICY "quiz_q_read"   ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "quiz_q_write"  ON public.quiz_questions FOR ALL    USING (current_user = 'postgres');

-- users  (usernames are public; PIN hash is never returned by the API)
CREATE POLICY "users_read"    ON public.users FOR SELECT USING (true);
CREATE POLICY "users_write"   ON public.users FOR ALL    USING (current_user = 'postgres');

-- circles (community circles are public)
CREATE POLICY "circles_read"  ON public.circles FOR SELECT USING (true);
CREATE POLICY "circles_write" ON public.circles FOR ALL    USING (current_user = 'postgres');

-- chat_messages (community messages are public)
CREATE POLICY "chat_read"     ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "chat_write"    ON public.chat_messages FOR ALL    USING (current_user = 'postgres');

-- debates
CREATE POLICY "debates_read"  ON public.debates FOR SELECT USING (true);
CREATE POLICY "debates_write" ON public.debates FOR ALL    USING (current_user = 'postgres');

-- anon_questions
CREATE POLICY "anon_q_read"   ON public.anon_questions FOR SELECT USING (true);
CREATE POLICY "anon_q_write"  ON public.anon_questions FOR ALL    USING (current_user = 'postgres');

-- ── PRIVATE tables (backend service-role only) ────────────────────
-- user_progress
CREATE POLICY "progress_svc"  ON public.user_progress  FOR ALL USING (current_user = 'postgres');

-- quiz_attempts
CREATE POLICY "attempts_svc"  ON public.quiz_attempts  FOR ALL USING (current_user = 'postgres');

-- debate_votes  (who voted what must stay private)
CREATE POLICY "dvotes_svc"    ON public.debate_votes   FOR ALL USING (current_user = 'postgres');

-- direct_messages (private DMs)
CREATE POLICY "dm_svc"        ON public.direct_messages FOR ALL USING (current_user = 'postgres');

-- ── Verification query ────────────────────────────────────────────
SELECT tablename,
       rowsecurity   AS rls_enabled,
       (SELECT count(*) FROM pg_policies p
        WHERE p.tablename = t.tablename AND p.schemaname = 'public') AS policy_count
FROM   pg_tables t
WHERE  schemaname = 'public'
  AND  tablename IN (
    'lessons','quiz_questions','users','quiz_attempts','user_progress',
    'circles','chat_messages','debates','debate_votes','anon_questions',
    'direct_messages'
  )
ORDER BY tablename;
