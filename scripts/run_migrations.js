const { Client } = require('pg')

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const migrations = [
  {
    name: '01_users_and_orgs',
    sql: `
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('superuser', 'coach', 'teamlid');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        role user_role NOT NULL DEFAULT 'teamlid',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        superuser_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: '02_teams_and_members',
    sql: `
      CREATE TABLE IF NOT EXISTS teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        coach_id UUID NOT NULL REFERENCES profiles(id),
        name TEXT NOT NULL,
        season_start DATE,
        season_end DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS team_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE(team_id, user_id)
      );
    `
  },
  {
    name: '03_goal_hierarchy',
    sql: `
      DO $$ BEGIN
        CREATE TYPE goal_session_type AS ENUM ('outcome_goals', 'performance_goals', 'process_goals');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE goal_session_status AS ENUM ('draft', 'active', 'concluded', 'approved');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE goal_status AS ENUM ('draft', 'presented', 'selected', 'approved');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      CREATE TABLE IF NOT EXISTS goal_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        session_type goal_session_type NOT NULL,
        session_number INT NOT NULL,
        session_date DATE,
        status goal_session_status DEFAULT 'draft',
        created_by UUID REFERENCES profiles(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS outcome_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        goal_session_id UUID REFERENCES goal_sessions(id),
        title TEXT NOT NULL,
        description TEXT,
        timeline TEXT,
        subgroup_created_by TEXT,
        status goal_status DEFAULT 'draft',
        presentation_order INT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        approved_at TIMESTAMPTZ,
        approved_by UUID REFERENCES profiles(id)
      );

      CREATE TABLE IF NOT EXISTS performance_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        outcome_goal_id UUID REFERENCES outcome_goals(id) ON DELETE CASCADE,
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        goal_session_id UUID REFERENCES goal_sessions(id),
        title TEXT NOT NULL,
        description TEXT,
        measurable_component TEXT,
        subgroup_created_by TEXT,
        status goal_status DEFAULT 'draft',
        presentation_order INT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        approved_at TIMESTAMPTZ,
        approved_by UUID REFERENCES profiles(id)
      );

      CREATE TABLE IF NOT EXISTS process_goals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        performance_goal_id UUID NOT NULL REFERENCES performance_goals(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        task TEXT,
        assigned_role TEXT,
        context_situation TEXT,
        created_by UUID REFERENCES profiles(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: '04_performance_profiles',
    sql: `
      CREATE TABLE IF NOT EXISTS performance_profile_characteristics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        characteristic_name TEXT NOT NULL,
        characteristic_order INT NOT NULL CHECK (characteristic_order BETWEEN 1 AND 12),
        created_by UUID REFERENCES profiles(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS performance_profile_butler_hardy (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teamlid_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        period TEXT NOT NULL,
        characteristic_id UUID NOT NULL REFERENCES performance_profile_characteristics(id),
        score INT NOT NULL CHECK (score BETWEEN 1 AND 10),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        shared_with_coach BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS performance_profile_jones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teamlid_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        period TEXT NOT NULL,
        characteristic_id UUID NOT NULL REFERENCES performance_profile_characteristics(id),
        importance_rating INT NOT NULL CHECK (importance_rating BETWEEN 1 AND 10),
        ideal_level INT NOT NULL CHECK (ideal_level BETWEEN 1 AND 10),
        current_level INT NOT NULL CHECK (current_level BETWEEN 1 AND 10),
        discrepancy_score INT GENERATED ALWAYS AS (ideal_level - current_level) STORED,
        priority_rank INT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        shared_with_coach BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS performance_profile_gucciardi (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teamlid_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        period TEXT NOT NULL,
        characteristic_name TEXT NOT NULL,
        definition_positive TEXT,
        definition_negative TEXT,
        context_situation TEXT,
        score INT NOT NULL CHECK (score BETWEEN -3 AND 3),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        shared_with_coach BOOLEAN DEFAULT FALSE
      );
    `
  },
  {
    name: '05_evaluations',
    sql: `
      DO $$ BEGIN
        CREATE TYPE questionnaire_type AS ENUM ('questionnaire_7', 'questionnaire_20_1', 'questionnaire_20_2');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE TYPE campaign_status AS ENUM ('draft', 'sent', 'in_progress', 'closed');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      CREATE TABLE IF NOT EXISTS questionnaire_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        questionnaire_type questionnaire_type NOT NULL,
        question_number INT NOT NULL,
        question_text TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS evaluation_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        period TEXT NOT NULL,
        questionnaire_type questionnaire_type NOT NULL,
        campaign_date DATE,
        status campaign_status DEFAULT 'draft',
        created_by UUID REFERENCES profiles(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        deadline DATE
      );

      CREATE TABLE IF NOT EXISTS evaluation_responses_q1 (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        evaluation_campaign_id UUID NOT NULL REFERENCES evaluation_campaigns(id) ON DELETE CASCADE,
        teamlid_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        period TEXT NOT NULL,
        q1_score INT CHECK (q1_score BETWEEN 1 AND 5),
        q2_score INT CHECK (q2_score BETWEEN 1 AND 5),
        q3_score INT CHECK (q3_score BETWEEN 1 AND 5),
        q4_score INT CHECK (q4_score BETWEEN 1 AND 5),
        q5_score INT CHECK (q5_score BETWEEN 1 AND 5),
        q6_score INT CHECK (q6_score BETWEEN 1 AND 5),
        q7_score INT CHECK (q7_score BETWEEN 1 AND 5),
        average_score DECIMAL(4,2),
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(evaluation_campaign_id, teamlid_id)
      );

      CREATE TABLE IF NOT EXISTS evaluation_responses_q2 (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        evaluation_campaign_id UUID NOT NULL REFERENCES evaluation_campaigns(id) ON DELETE CASCADE,
        teamlid_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        period TEXT NOT NULL,
        responses JSONB NOT NULL,
        average_score DECIMAL(4,2),
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(evaluation_campaign_id, teamlid_id)
      );

      CREATE TABLE IF NOT EXISTS evaluation_responses_q3 (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        evaluation_campaign_id UUID NOT NULL REFERENCES evaluation_campaigns(id) ON DELETE CASCADE,
        teamlid_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        period TEXT NOT NULL,
        responses JSONB NOT NULL,
        average_score DECIMAL(4,2),
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(evaluation_campaign_id, teamlid_id)
      );

      CREATE TABLE IF NOT EXISTS evaluation_summary_per_teamlid (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teamlid_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        period TEXT NOT NULL,
        questionnaire_1_avg DECIMAL(4,2),
        questionnaire_2_avg DECIMAL(4,2),
        questionnaire_3_avg DECIMAL(4,2),
        overall_avg DECIMAL(4,2),
        calculated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(teamlid_id, team_id, period)
      );

      CREATE TABLE IF NOT EXISTS evaluation_summary_per_team (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        period TEXT NOT NULL,
        questionnaire_1_team_avg DECIMAL(4,2),
        questionnaire_2_team_avg DECIMAL(4,2),
        questionnaire_3_team_avg DECIMAL(4,2),
        questionnaire_1_u3_score DECIMAL(4,2),
        questionnaire_2_u3_score DECIMAL(4,2),
        questionnaire_3_u3_score DECIMAL(4,2),
        overall_team_avg DECIMAL(4,2),
        calculated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(team_id, period)
      );
    `
  },
  {
    name: '06_coach_evaluations',
    sql: `
      CREATE TABLE IF NOT EXISTS coach_performance_evaluations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        performance_goal_id UUID NOT NULL REFERENCES performance_goals(id) ON DELETE CASCADE,
        teamlid_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        period TEXT NOT NULL,
        evaluation_score INT CHECK (evaluation_score BETWEEN 1 AND 10),
        coach_notes TEXT,
        data_sources JSONB,
        created_by UUID REFERENCES profiles(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
  {
    name: '07_dashboard_metrics',
    sql: `
      CREATE TABLE IF NOT EXISTS dashboard_team_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        period TEXT NOT NULL,
        metric_type TEXT NOT NULL,
        data JSONB,
        calculated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS dashboard_individual_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        teamlid_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        period TEXT NOT NULL,
        profiler_progress JSONB,
        evaluation_trend JSONB,
        coach_feedback_avg DECIMAL(4,2),
        calculated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  },
]

async function runMigrations() {
  await client.connect()
  console.log('[v0] Connected to Supabase database')

  for (const migration of migrations) {
    console.log(`[v0] Running migration: ${migration.name}`)
    try {
      await client.query(migration.sql)
      console.log(`[v0] Done: ${migration.name}`)
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`[v0] Skipped (already exists): ${migration.name}`)
      } else {
        console.error(`[v0] Error in ${migration.name}:`, err.message)
        await client.end()
        process.exit(1)
      }
    }
  }

  await client.end()
  console.log('[v0] All migrations completed successfully!')
}

runMigrations()
