const { Client } = require('pg')

const client = new Client({ connectionString: process.env.DATABASE_URL })

const sql = `
-- Step 1: Trigger to auto-create public.profiles row on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
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

-- Step 2: Enable RLS on all public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcome_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_profile_characteristics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_profile_butler_hardy ENABLE ROW LEVEL SECURITY;
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

-- Profiles: own row + superuser sees all
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_superuser_all" ON public.profiles;
CREATE POLICY "profiles_superuser_all" ON public.profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser'));

-- Organizations: superuser full access
DROP POLICY IF EXISTS "organizations_superuser" ON public.organizations;
CREATE POLICY "organizations_superuser" ON public.organizations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser'));

-- Teams: coach, member, superuser
DROP POLICY IF EXISTS "teams_access" ON public.teams;
CREATE POLICY "teams_access" ON public.teams FOR ALL
  USING (
    coach_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser')
    OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = id AND tm.user_id = auth.uid())
  );

-- Team members
DROP POLICY IF EXISTS "team_members_access" ON public.team_members;
CREATE POLICY "team_members_access" ON public.team_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser')
  );
DROP POLICY IF EXISTS "team_members_manage" ON public.team_members;
CREATE POLICY "team_members_manage" ON public.team_members FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser')
  );

-- Goal sessions
DROP POLICY IF EXISTS "goal_sessions_read" ON public.goal_sessions;
CREATE POLICY "goal_sessions_read" ON public.goal_sessions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = goal_sessions.team_id AND tm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser')
  );
DROP POLICY IF EXISTS "goal_sessions_manage" ON public.goal_sessions;
CREATE POLICY "goal_sessions_manage" ON public.goal_sessions FOR ALL
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser')
  );

-- Outcome, performance, process goals: same pattern as goal_sessions
DROP POLICY IF EXISTS "outcome_goals_read" ON public.outcome_goals;
CREATE POLICY "outcome_goals_read" ON public.outcome_goals FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = outcome_goals.team_id AND tm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = outcome_goals.team_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser'));
DROP POLICY IF EXISTS "outcome_goals_manage" ON public.outcome_goals;
CREATE POLICY "outcome_goals_manage" ON public.outcome_goals FOR ALL
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('superuser','coach')));

DROP POLICY IF EXISTS "performance_goals_read" ON public.performance_goals;
CREATE POLICY "performance_goals_read" ON public.performance_goals FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = performance_goals.team_id AND tm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = performance_goals.team_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser'));
DROP POLICY IF EXISTS "performance_goals_manage" ON public.performance_goals;
CREATE POLICY "performance_goals_manage" ON public.performance_goals FOR ALL
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('superuser','coach')));

DROP POLICY IF EXISTS "process_goals_manage" ON public.process_goals;
CREATE POLICY "process_goals_manage" ON public.process_goals FOR ALL
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('superuser','coach')));

-- Performance profile characteristics: coach manages, teamlid reads
DROP POLICY IF EXISTS "pp_chars_access" ON public.performance_profile_characteristics;
CREATE POLICY "pp_chars_access" ON public.performance_profile_characteristics FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = performance_profile_characteristics.team_id AND tm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.teams t WHERE t.id = performance_profile_characteristics.team_id AND t.coach_id = auth.uid()));
DROP POLICY IF EXISTS "pp_chars_manage" ON public.performance_profile_characteristics;
CREATE POLICY "pp_chars_manage" ON public.performance_profile_characteristics FOR ALL
  USING (EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser'));

-- Butler & Hardy profiler: own or shared with coach
DROP POLICY IF EXISTS "pp_butler_own" ON public.performance_profile_butler_hardy;
CREATE POLICY "pp_butler_own" ON public.performance_profile_butler_hardy FOR ALL
  USING (
    teamlid_id = auth.uid()
    OR (shared_with_coach = true AND EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = performance_profile_butler_hardy.teamlid_id AND t.coach_id = auth.uid()
    ))
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser')
  );

-- Jones profiler
DROP POLICY IF EXISTS "pp_jones_own" ON public.performance_profile_jones;
CREATE POLICY "pp_jones_own" ON public.performance_profile_jones FOR ALL
  USING (
    teamlid_id = auth.uid()
    OR (shared_with_coach = true AND EXISTS (
      SELECT 1 FROM public.teams t JOIN public.team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = performance_profile_jones.teamlid_id AND t.coach_id = auth.uid()
    ))
  );

-- Gucciardi profiler
DROP POLICY IF EXISTS "pp_gucciardi_own" ON public.performance_profile_gucciardi;
CREATE POLICY "pp_gucciardi_own" ON public.performance_profile_gucciardi FOR ALL
  USING (
    teamlid_id = auth.uid()
    OR (shared_with_coach = true AND EXISTS (
      SELECT 1 FROM public.teams t JOIN public.team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = performance_profile_gucciardi.teamlid_id AND t.coach_id = auth.uid()
    ))
  );

-- Questionnaire questions: everyone can read
DROP POLICY IF EXISTS "questionnaire_read_all" ON public.questionnaire_questions;
CREATE POLICY "questionnaire_read_all" ON public.questionnaire_questions FOR SELECT USING (true);

-- Evaluation campaigns: coach manages, members read
DROP POLICY IF EXISTS "campaigns_read" ON public.evaluation_campaigns;
CREATE POLICY "campaigns_read" ON public.evaluation_campaigns FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = evaluation_campaigns.team_id AND tm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser')
  );
DROP POLICY IF EXISTS "campaigns_manage" ON public.evaluation_campaigns;
CREATE POLICY "campaigns_manage" ON public.evaluation_campaigns FOR ALL
  USING (created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser'));

-- Evaluation responses: own only
DROP POLICY IF EXISTS "responses_q1_own" ON public.evaluation_responses_q1;
CREATE POLICY "responses_q1_own" ON public.evaluation_responses_q1 FOR ALL USING (teamlid_id = auth.uid());
DROP POLICY IF EXISTS "responses_q2_own" ON public.evaluation_responses_q2;
CREATE POLICY "responses_q2_own" ON public.evaluation_responses_q2 FOR ALL USING (teamlid_id = auth.uid());
DROP POLICY IF EXISTS "responses_q3_own" ON public.evaluation_responses_q3;
CREATE POLICY "responses_q3_own" ON public.evaluation_responses_q3 FOR ALL USING (teamlid_id = auth.uid());

-- Evaluation summaries per team: coach + members read
DROP POLICY IF EXISTS "summary_team_access" ON public.evaluation_summary_per_team;
CREATE POLICY "summary_team_access" ON public.evaluation_summary_per_team FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = evaluation_summary_per_team.team_id AND tm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser')
  );

-- Evaluation summaries per teamlid: own + coach + superuser
DROP POLICY IF EXISTS "summary_teamlid_own" ON public.evaluation_summary_per_teamlid;
CREATE POLICY "summary_teamlid_own" ON public.evaluation_summary_per_teamlid FOR SELECT
  USING (
    teamlid_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('superuser', 'coach'))
  );

-- Coach evaluations
DROP POLICY IF EXISTS "coach_evals_access" ON public.coach_performance_evaluations;
CREATE POLICY "coach_evals_access" ON public.coach_performance_evaluations FOR ALL
  USING (
    created_by = auth.uid()
    OR teamlid_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser')
  );

-- Dashboard metrics: team
DROP POLICY IF EXISTS "dashboard_team_access" ON public.dashboard_team_metrics;
CREATE POLICY "dashboard_team_access" ON public.dashboard_team_metrics FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = dashboard_team_metrics.team_id AND tm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser')
  );

-- Dashboard metrics: individual
DROP POLICY IF EXISTS "dashboard_individual_own" ON public.dashboard_individual_metrics;
CREATE POLICY "dashboard_individual_own" ON public.dashboard_individual_metrics FOR SELECT
  USING (
    teamlid_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('superuser', 'coach'))
  );
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
