const { Client } = require('pg')
const { readFileSync, existsSync } = require('fs')
const { join } = require('path')

// Load .env.local
const envPath = join(__dirname, '..', '.env.local')
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim()
        const value = trimmed.substring(eqIndex + 1).trim().replace(/^["']|["']$/g, '')
        process.env[key] = value
      }
    }
  }
}

const client = new Client({ connectionString: process.env.DATABASE_URL })

const sql = `
-- ============================================================
-- Phase 4: Flexible Questionnaire System
-- Drops old simple tables, replaces with flexible schema
-- ============================================================

-- 1. Drop old simple questionnaire_questions table if exists
DROP TABLE IF EXISTS public.questionnaire_questions CASCADE;

-- 2. questionnaire_definitions
-- Defines each questionnaire (name, version, scoring logic)
CREATE TABLE IF NOT EXISTS public.questionnaire_definitions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES public.organizations(id) ON DELETE CASCADE,  -- NULL = global/template
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  version             VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  questionnaire_key   VARCHAR(50) NOT NULL,  -- e.g. 'motivation', 'cohesion', 'performance'
  total_questions     INT NOT NULL,
  likert_min          INT NOT NULL DEFAULT 1,
  likert_max          INT NOT NULL DEFAULT 5,
  scoring_method      VARCHAR(50) NOT NULL DEFAULT 'average',  -- 'average', 'sum', 'weighted'
  has_special_chart   BOOLEAN NOT NULL DEFAULT false,  -- true for motivation questionnaire
  chart_type          VARCHAR(50),  -- 'radar', 'bar', 'line', 'custom_motivation'
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. questionnaire_subscales
-- Defines subscales/subgroups of questions (e.g. intrinsic motivation, extrinsic motivation)
CREATE TABLE IF NOT EXISTS public.questionnaire_subscales (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id         UUID NOT NULL REFERENCES public.questionnaire_definitions(id) ON DELETE CASCADE,
  name                     VARCHAR(255) NOT NULL,
  description              TEXT,
  subscale_key             VARCHAR(50) NOT NULL,  -- e.g. 'intrinsic', 'extrinsic', 'amotivation'
  color                    VARCHAR(20),           -- hex color for chart
  display_order            INT NOT NULL DEFAULT 0,
  scoring_method           VARCHAR(50) NOT NULL DEFAULT 'average',  -- can override per subscale
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. questionnaire_questions (new, flexible)
CREATE TABLE IF NOT EXISTS public.questionnaire_questions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_id    UUID NOT NULL REFERENCES public.questionnaire_definitions(id) ON DELETE CASCADE,
  subscale_id         UUID REFERENCES public.questionnaire_subscales(id) ON DELETE SET NULL,
  question_number     INT NOT NULL,
  question_text       TEXT NOT NULL,
  is_reversed         BOOLEAN NOT NULL DEFAULT false,  -- true = recode (6 - score for 1-5, 8 - score for 1-7)
  is_active           BOOLEAN NOT NULL DEFAULT true,
  help_text           TEXT,  -- optional tooltip/explanation
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(questionnaire_id, question_number)
);

-- 5. evaluation_campaigns (updated - references questionnaire_definitions)
-- Drop and recreate to reference new table
DROP TABLE IF EXISTS public.evaluation_campaigns CASCADE;
CREATE TABLE IF NOT EXISTS public.evaluation_campaigns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id             UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  questionnaire_id    UUID NOT NULL REFERENCES public.questionnaire_definitions(id),
  period              VARCHAR(20) NOT NULL,  -- t0, t1, t2, ..., tx
  label               VARCHAR(255),          -- e.g. "Na wedstrijd 5" or "November 2024"
  status              campaign_status NOT NULL DEFAULT 'draft',
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline            DATE,
  sent_at             TIMESTAMPTZ,
  closed_at           TIMESTAMPTZ
);

-- 6. evaluation_responses (new unified table, replaces q1/q2/q3 split)
-- Stores all responses as JSONB for flexibility
DROP TABLE IF EXISTS public.evaluation_responses_q1 CASCADE;
DROP TABLE IF EXISTS public.evaluation_responses_q2 CASCADE;
DROP TABLE IF EXISTS public.evaluation_responses_q3 CASCADE;

CREATE TABLE IF NOT EXISTS public.evaluation_responses (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id               UUID NOT NULL REFERENCES public.evaluation_campaigns(id) ON DELETE CASCADE,
  teamlid_id                UUID NOT NULL REFERENCES auth.users(id),
  responses                 JSONB NOT NULL,  -- { "1": 4, "2": 2, "3": 5, ... } question_number -> score
  raw_total_score           DECIMAL(8,3),    -- sum of (possibly recoded) scores
  calculated_avg            DECIMAL(8,3),    -- average of all questions
  subscale_scores           JSONB,           -- { "intrinsic": 4.2, "extrinsic": 2.8, ... }
  submitted_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, teamlid_id)
);

-- 7. evaluation_team_summaries (replaces per-team and per-teamlid tables)
-- Pre-calculated team aggregates per campaign
CREATE TABLE IF NOT EXISTS public.evaluation_team_summaries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         UUID NOT NULL REFERENCES public.evaluation_campaigns(id) ON DELETE CASCADE,
  team_id             UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  period              VARCHAR(20) NOT NULL,
  response_count      INT NOT NULL DEFAULT 0,
  team_avg            DECIMAL(8,3),
  subscale_averages   JSONB,   -- { "intrinsic": 3.8, "extrinsic": 2.6, ... }
  u3_score            DECIMAL(8,3),  -- % above previous period median
  calculated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, team_id)
);

-- 8. Enable RLS on new tables
ALTER TABLE public.questionnaire_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_subscales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questionnaire_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_team_summaries ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies

-- questionnaire_definitions: superuser manages, everyone reads
DROP POLICY IF EXISTS "qdef_read_all" ON public.questionnaire_definitions;
CREATE POLICY "qdef_read_all" ON public.questionnaire_definitions FOR SELECT USING (true);
DROP POLICY IF EXISTS "qdef_manage_superuser" ON public.questionnaire_definitions;
CREATE POLICY "qdef_manage_superuser" ON public.questionnaire_definitions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser'));

-- questionnaire_subscales: same
DROP POLICY IF EXISTS "qsub_read_all" ON public.questionnaire_subscales;
CREATE POLICY "qsub_read_all" ON public.questionnaire_subscales FOR SELECT USING (true);
DROP POLICY IF EXISTS "qsub_manage_superuser" ON public.questionnaire_subscales;
CREATE POLICY "qsub_manage_superuser" ON public.questionnaire_subscales FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser'));

-- questionnaire_questions: same
DROP POLICY IF EXISTS "qq_read_all" ON public.questionnaire_questions;
CREATE POLICY "qq_read_all" ON public.questionnaire_questions FOR SELECT USING (true);
DROP POLICY IF EXISTS "qq_manage_superuser" ON public.questionnaire_questions;
CREATE POLICY "qq_manage_superuser" ON public.questionnaire_questions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser'));

-- evaluation_campaigns: coach manages, teamleden read
DROP POLICY IF EXISTS "ecampaign_read" ON public.evaluation_campaigns;
CREATE POLICY "ecampaign_read" ON public.evaluation_campaigns FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = evaluation_campaigns.team_id AND tm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser')
  );
DROP POLICY IF EXISTS "ecampaign_manage" ON public.evaluation_campaigns;
CREATE POLICY "ecampaign_manage" ON public.evaluation_campaigns FOR ALL
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('superuser', 'coach')));

-- evaluation_responses: own only, coach/superuser can read for their team
DROP POLICY IF EXISTS "eresp_own" ON public.evaluation_responses;
CREATE POLICY "eresp_own" ON public.evaluation_responses FOR ALL
  USING (teamlid_id = auth.uid());
DROP POLICY IF EXISTS "eresp_coach_read" ON public.evaluation_responses;
CREATE POLICY "eresp_coach_read" ON public.evaluation_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.evaluation_campaigns ec
    JOIN public.teams t ON t.id = ec.team_id
    WHERE ec.id = evaluation_responses.campaign_id AND t.coach_id = auth.uid()
  ) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser'));

-- evaluation_team_summaries: coach + team members + superuser
DROP POLICY IF EXISTS "eteam_sum_read" ON public.evaluation_team_summaries;
CREATE POLICY "eteam_sum_read" ON public.evaluation_team_summaries FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.coach_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = evaluation_team_summaries.team_id AND tm.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superuser')
  );
DROP POLICY IF EXISTS "eteam_sum_manage" ON public.evaluation_team_summaries;
CREATE POLICY "eteam_sum_manage" ON public.evaluation_team_summaries FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('superuser', 'coach')));

-- 10. Updated at trigger for questionnaire_definitions
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS qdef_updated_at ON public.questionnaire_definitions;
CREATE TRIGGER qdef_updated_at BEFORE UPDATE ON public.questionnaire_definitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
`

async function run() {
  await client.connect()
  console.log('[v0] Running Phase 4 questionnaire migrations...')
  try {
    await client.query(sql)
    console.log('[v0] Phase 4 migration complete!')
    console.log('[v0] Created tables: questionnaire_definitions, questionnaire_subscales, questionnaire_questions, evaluation_campaigns, evaluation_responses, evaluation_team_summaries')
  } catch (err) {
    console.error('[v0] Migration error:', err.message)
  } finally {
    await client.end()
  }
}

run()
