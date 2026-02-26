const { Client } = require('pg')

const client = new Client({ connectionString: process.env.DATABASE_URL })

const sql = `
-- Step 1: Link public.users to auth.users via foreign key (if not already done)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Trigger to auto-create public.users row on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'teamlid')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Enable RLS on all public tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcome_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_profile_characteristics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_profile_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_profile_jones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_profile_gucciardi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_responses_q1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_responses_q2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_responses_q3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_summary_per_teamlid ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_summary_per_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_performance_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_team_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_individual_metrics ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies

-- Users: own row
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "users_superuser_all" ON public.users;
CREATE POLICY "users_superuser_all" ON public.users FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'superuser'));

-- Organizations: superuser full access
DROP POLICY IF EXISTS "organizations_superuser" ON public.organizations;
CREATE POLICY "organizations_superuser" ON public.organizations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'superuser'));

-- Teams: coach, member, superuser
DROP POLICY IF EXISTS "teams_access" ON public.teams;
CREATE POLICY "teams_access" ON public.teams FOR ALL
  USING (
    coach_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'superuser')
    OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = id AND tm.user_id = auth.uid())
  );

-- Team members
DROP POLICY IF EXISTS "team_members_access" ON public.team_members;
CREATE POLICY "team_members_access" ON public.team_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'superuser')
  );
DROP POLICY IF EXISTS "team_members_manage" ON public.team_members;
CREATE POLICY "team_members_manage" ON public.team_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'superuser'));

-- Goal sessions, outcome/performance/process goals: coach + superuser manage, members read
DROP POLICY IF EXISTS "goal_sessions_access" ON public.goal_sessions;
CREATE POLICY "goal_sessions_access" ON public.goal_sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = goal_sessions.team_id AND tm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'superuser'));
DROP POLICY IF EXISTS "goal_sessions_manage" ON public.goal_sessions;
CREATE POLICY "goal_sessions_manage" ON public.goal_sessions FOR ALL
  USING (created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'superuser'));

-- Performance profile: own data or shared with coach
DROP POLICY IF EXISTS "perf_data_own" ON public.performance_profile_data;
CREATE POLICY "perf_data_own" ON public.performance_profile_data FOR ALL
  USING (
    teamlid_id = auth.uid()
    OR (shared_with_coach = true AND EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = performance_profile_data.teamlid_id AND t.coach_id = auth.uid()
    ))
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'superuser')
  );

DROP POLICY IF EXISTS "perf_jones_own" ON public.performance_profile_jones;
CREATE POLICY "perf_jones_own" ON public.performance_profile_jones FOR ALL
  USING (teamlid_id = auth.uid()
    OR (shared_with_coach = true AND EXISTS (
      SELECT 1 FROM public.teams t JOIN public.team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = performance_profile_jones.teamlid_id AND t.coach_id = auth.uid()
    )));

DROP POLICY IF EXISTS "perf_gucciardi_own" ON public.performance_profile_gucciardi;
CREATE POLICY "perf_gucciardi_own" ON public.performance_profile_gucciardi FOR ALL
  USING (teamlid_id = auth.uid()
    OR (shared_with_coach = true AND EXISTS (
      SELECT 1 FROM public.teams t JOIN public.team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = performance_profile_gucciardi.teamlid_id AND t.coach_id = auth.uid()
    )));

-- Questionnaire questions: everyone can read
DROP POLICY IF EXISTS "questionnaire_read_all" ON public.questionnaire_questions;
CREATE POLICY "questionnaire_read_all" ON public.questionnaire_questions FOR SELECT USING (true);

-- Evaluation campaigns
DROP POLICY IF EXISTS "campaigns_access" ON public.evaluation_campaigns;
CREATE POLICY "campaigns_access" ON public.evaluation_campaigns FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = evaluation_campaigns.team_id AND tm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'superuser')
  );
DROP POLICY IF EXISTS "campaigns_manage" ON public.evaluation_campaigns;
CREATE POLICY "campaigns_manage" ON public.evaluation_campaigns FOR ALL
  USING (created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'superuser'));

-- Evaluation responses: own
DROP POLICY IF EXISTS "responses_q1_own" ON public.evaluation_responses_q1;
CREATE POLICY "responses_q1_own" ON public.evaluation_responses_q1 FOR ALL USING (teamlid_id = auth.uid());
DROP POLICY IF EXISTS "responses_q2_own" ON public.evaluation_responses_q2;
CREATE POLICY "responses_q2_own" ON public.evaluation_responses_q2 FOR ALL USING (teamlid_id = auth.uid());
DROP POLICY IF EXISTS "responses_q3_own" ON public.evaluation_responses_q3;
CREATE POLICY "responses_q3_own" ON public.evaluation_responses_q3 FOR ALL USING (teamlid_id = auth.uid());

-- Summaries: team-level visible to coach + members
DROP POLICY IF EXISTS "summary_team_access" ON public.evaluation_summary_per_team;
CREATE POLICY "summary_team_access" ON public.evaluation_summary_per_team FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = evaluation_summary_per_team.team_id AND tm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'superuser')
  );

DROP POLICY IF EXISTS "summary_teamlid_own" ON public.evaluation_summary_per_teamlid;
CREATE POLICY "summary_teamlid_own" ON public.evaluation_summary_per_teamlid FOR SELECT
  USING (teamlid_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superuser', 'coach')));

-- Coach evaluations
DROP POLICY IF EXISTS "coach_evals_access" ON public.coach_performance_evaluations;
CREATE POLICY "coach_evals_access" ON public.coach_performance_evaluations FOR ALL
  USING (created_by = auth.uid()
    OR teamlid_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'superuser'));

-- Dashboard metrics
DROP POLICY IF EXISTS "dashboard_team_access" ON public.dashboard_team_metrics;
CREATE POLICY "dashboard_team_access" ON public.dashboard_team_metrics FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = dashboard_team_metrics.team_id AND tm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'superuser')
  );

DROP POLICY IF EXISTS "dashboard_individual_own" ON public.dashboard_individual_metrics;
CREATE POLICY "dashboard_individual_own" ON public.dashboard_individual_metrics FOR SELECT
  USING (teamlid_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('superuser', 'coach')));
`

async function run() {
  await client.connect()
  console.log('[v0] Running RLS policies migration...')
  try {
    await client.query(sql)
    console.log('[v0] RLS policies applied successfully!')
  } catch (err) {
    console.error('[v0] Error applying RLS:', err.message)
  } finally {
    await client.end()
  }
}

run()
