const { Client } = require('pg')

const client = new Client({ connectionString: process.env.DATABASE_URL })

const sql = `
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_profile_characteristics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_profile_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_profile_jones ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_profile_gucciardi ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_responses_q1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_responses_q2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_responses_q3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_summary_per_teamlid ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_summary_per_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_performance_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_team_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_individual_metrics ENABLE ROW LEVEL SECURITY;

-- Users: can read own row
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);

-- Superusers can read all users
DROP POLICY IF EXISTS "users_superuser_all" ON users;
CREATE POLICY "users_superuser_all" ON users FOR ALL
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'superuser'));

-- Organizations: superuser full access
DROP POLICY IF EXISTS "organizations_superuser" ON organizations;
CREATE POLICY "organizations_superuser" ON organizations FOR ALL
  USING (EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'superuser'));

-- Teams: coaches and members can read their teams
DROP POLICY IF EXISTS "teams_coach_access" ON teams;
CREATE POLICY "teams_coach_access" ON teams FOR ALL
  USING (
    coach_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'superuser')
    OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = id AND tm.user_id = auth.uid())
  );

-- Team members: coaches and superusers manage, members see own
DROP POLICY IF EXISTS "team_members_access" ON team_members;
CREATE POLICY "team_members_access" ON team_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM teams t WHERE t.id = team_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'superuser')
  );

-- Performance profile data: own data only, or shared with coach
DROP POLICY IF EXISTS "perf_data_own" ON performance_profile_data;
CREATE POLICY "perf_data_own" ON performance_profile_data FOR ALL
  USING (
    teamlid_id = auth.uid()
    OR (shared_with_coach = true AND EXISTS (
      SELECT 1 FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
      WHERE tm.user_id = performance_profile_data.teamlid_id
      AND t.coach_id = auth.uid()
    ))
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'superuser')
  );

-- Questionnaire questions: everyone can read
DROP POLICY IF EXISTS "questionnaire_read_all" ON questionnaire_questions;
CREATE POLICY "questionnaire_read_all" ON questionnaire_questions FOR SELECT USING (true);

-- Evaluation campaigns: coaches manage, team members see their own
DROP POLICY IF EXISTS "campaigns_access" ON evaluation_campaigns;
CREATE POLICY "campaigns_access" ON evaluation_campaigns FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = evaluation_campaigns.team_id AND tm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'superuser')
  );

-- Evaluation responses: own responses
DROP POLICY IF EXISTS "responses_q1_own" ON evaluation_responses_q1;
CREATE POLICY "responses_q1_own" ON evaluation_responses_q1 FOR ALL USING (teamlid_id = auth.uid());

DROP POLICY IF EXISTS "responses_q2_own" ON evaluation_responses_q2;
CREATE POLICY "responses_q2_own" ON evaluation_responses_q2 FOR ALL USING (teamlid_id = auth.uid());

DROP POLICY IF EXISTS "responses_q3_own" ON evaluation_responses_q3;
CREATE POLICY "responses_q3_own" ON evaluation_responses_q3 FOR ALL USING (teamlid_id = auth.uid());

-- Summary tables: coaches and members see team data
DROP POLICY IF EXISTS "summary_team_access" ON evaluation_summary_per_team;
CREATE POLICY "summary_team_access" ON evaluation_summary_per_team FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM teams t WHERE t.id = team_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM team_members tm WHERE tm.team_id = evaluation_summary_per_team.team_id AND tm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'superuser')
  );

DROP POLICY IF EXISTS "summary_teamlid_own" ON evaluation_summary_per_teamlid;
CREATE POLICY "summary_teamlid_own" ON evaluation_summary_per_teamlid FOR SELECT
  USING (teamlid_id = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('superuser', 'coach')));
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
