-- Phase 1.5: Evaluation System - 3 Questionnaires
-- Questionnaire 1 (7 questions), Questionnaire 2 (20 questions), Questionnaire 3 (20 questions)

CREATE TABLE questionnaire_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  questionnaire_type VARCHAR(50) NOT NULL CHECK (questionnaire_type IN ('questionnaire_7', 'questionnaire_20_1', 'questionnaire_20_2')),
  question_number INT NOT NULL,
  question_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(questionnaire_type, question_number)
);

CREATE TABLE evaluation_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  period VARCHAR(10) NOT NULL, -- t0, t1, t2, ..., tx
  questionnaire_type VARCHAR(50) NOT NULL CHECK (questionnaire_type IN ('questionnaire_7', 'questionnaire_20_1', 'questionnaire_20_2')),
  campaign_date DATE,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'in_progress', 'closed')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  deadline DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questionnaire 1 (7 questions, 1-5 scale)
CREATE TABLE evaluation_responses_q1 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_campaign_id UUID NOT NULL REFERENCES evaluation_campaigns(id) ON DELETE CASCADE,
  teamlid_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  period VARCHAR(10) NOT NULL, -- t0, t1, t2, ..., tx
  q1_score INT CHECK (q1_score >= 1 AND q1_score <= 5),
  q2_score INT CHECK (q2_score >= 1 AND q2_score <= 5),
  q3_score INT CHECK (q3_score >= 1 AND q3_score <= 5),
  q4_score INT CHECK (q4_score >= 1 AND q4_score <= 5),
  q5_score INT CHECK (q5_score >= 1 AND q5_score <= 5),
  q6_score INT CHECK (q6_score >= 1 AND q6_score <= 5),
  q7_score INT CHECK (q7_score >= 1 AND q7_score <= 5),
  average_score DECIMAL(5,2) GENERATED ALWAYS AS (
    ROUND((q1_score + q2_score + q3_score + q4_score + q5_score + q6_score + q7_score)::DECIMAL / 7, 2)
  ) STORED,
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(evaluation_campaign_id, teamlid_id)
);

-- Questionnaire 2 (20 questions, 1-5 scale)
CREATE TABLE evaluation_responses_q2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_campaign_id UUID NOT NULL REFERENCES evaluation_campaigns(id) ON DELETE CASCADE,
  teamlid_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  period VARCHAR(10) NOT NULL, -- t0, t1, t2, ..., tx
  responses JSONB NOT NULL, -- {q1: 3, q2: 4, ..., q20: 5}
  average_score DECIMAL(5,2),
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(evaluation_campaign_id, teamlid_id)
);

-- Questionnaire 3 (20 questions, 1-5 scale)
CREATE TABLE evaluation_responses_q3 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_campaign_id UUID NOT NULL REFERENCES evaluation_campaigns(id) ON DELETE CASCADE,
  teamlid_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  period VARCHAR(10) NOT NULL, -- t0, t1, t2, ..., tx
  responses JSONB NOT NULL, -- {q1: 3, q2: 4, ..., q20: 5}
  average_score DECIMAL(5,2),
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(evaluation_campaign_id, teamlid_id)
);

-- Per-teamlid evaluation summary (average across all 3 questionnaires)
CREATE TABLE evaluation_summary_per_teamlid (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teamlid_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  period VARCHAR(10) NOT NULL,
  questionnaire_1_avg DECIMAL(5,2),
  questionnaire_2_avg DECIMAL(5,2),
  questionnaire_3_avg DECIMAL(5,2),
  overall_avg DECIMAL(5,2),
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(teamlid_id, team_id, period)
);

-- Per-team evaluation summary (team averages + U3-50% score)
CREATE TABLE evaluation_summary_per_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  period VARCHAR(10) NOT NULL,
  questionnaire_1_team_avg DECIMAL(5,2),
  questionnaire_2_team_avg DECIMAL(5,2),
  questionnaire_3_team_avg DECIMAL(5,2),
  questionnaire_1_u3_score DECIMAL(5,2), -- % > 50th percentile
  questionnaire_2_u3_score DECIMAL(5,2),
  questionnaire_3_u3_score DECIMAL(5,2),
  overall_team_avg DECIMAL(5,2),
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, period)
);

-- Indices
CREATE INDEX idx_evaluation_campaigns_team_id ON evaluation_campaigns(team_id);
CREATE INDEX idx_evaluation_campaigns_period ON evaluation_campaigns(period);
CREATE INDEX idx_eval_q1_campaign_id ON evaluation_responses_q1(evaluation_campaign_id);
CREATE INDEX idx_eval_q1_teamlid_id ON evaluation_responses_q1(teamlid_id);
CREATE INDEX idx_eval_q1_period ON evaluation_responses_q1(period);
CREATE INDEX idx_eval_q2_campaign_id ON evaluation_responses_q2(evaluation_campaign_id);
CREATE INDEX idx_eval_q2_teamlid_id ON evaluation_responses_q2(teamlid_id);
CREATE INDEX idx_eval_q3_campaign_id ON evaluation_responses_q3(evaluation_campaign_id);
CREATE INDEX idx_eval_q3_teamlid_id ON evaluation_responses_q3(teamlid_id);
CREATE INDEX idx_eval_summary_teamlid ON evaluation_summary_per_teamlid(teamlid_id);
CREATE INDEX idx_eval_summary_team ON evaluation_summary_per_team(team_id);

-- Enable RLS
ALTER TABLE questionnaire_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_responses_q1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_responses_q2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_responses_q3 ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_summary_per_teamlid ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_summary_per_team ENABLE ROW LEVEL SECURITY;

-- Questionnaire questions are public (coaches/teamlids need to see questions)
ALTER TABLE questionnaire_questions DISABLE ROW LEVEL SECURITY;

-- RLS Policies - Evaluation Campaigns (coach-only)
CREATE POLICY "Coach can view team campaigns" ON evaluation_campaigns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams WHERE id = evaluation_campaigns.team_id AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Coach can manage team campaigns" ON evaluation_campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams WHERE id = evaluation_campaigns.team_id AND coach_id = auth.uid()
    )
  );

-- RLS Policies - Evaluation Responses (own responses + team summaries)
CREATE POLICY "Teamlid can view own q1 responses" ON evaluation_responses_q1
  FOR SELECT USING (auth.uid() = teamlid_id);

CREATE POLICY "Teamlid can submit q1 responses" ON evaluation_responses_q1
  FOR INSERT WITH CHECK (auth.uid() = teamlid_id);

CREATE POLICY "Teamlid can update own q1 responses" ON evaluation_responses_q1
  FOR UPDATE USING (auth.uid() = teamlid_id);

CREATE POLICY "Coach can view team q1 averages" ON evaluation_responses_q1
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams WHERE id = evaluation_responses_q1.team_id AND coach_id = auth.uid()
    )
  );

-- Apply same policies for Q2 and Q3
CREATE POLICY "Teamlid can view own q2 responses" ON evaluation_responses_q2
  FOR SELECT USING (auth.uid() = teamlid_id);

CREATE POLICY "Teamlid can submit q2 responses" ON evaluation_responses_q2
  FOR INSERT WITH CHECK (auth.uid() = teamlid_id);

CREATE POLICY "Coach can view team q2 averages" ON evaluation_responses_q2
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams WHERE id = evaluation_responses_q2.team_id AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Teamlid can view own q3 responses" ON evaluation_responses_q3
  FOR SELECT USING (auth.uid() = teamlid_id);

CREATE POLICY "Teamlid can submit q3 responses" ON evaluation_responses_q3
  FOR INSERT WITH CHECK (auth.uid() = teamlid_id);

CREATE POLICY "Coach can view team q3 averages" ON evaluation_responses_q3
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams WHERE id = evaluation_responses_q3.team_id AND coach_id = auth.uid()
    )
  );

-- Summary visibility
CREATE POLICY "Teamlid can view own summary" ON evaluation_summary_per_teamlid
  FOR SELECT USING (auth.uid() = teamlid_id);

CREATE POLICY "Coach can view team summary" ON evaluation_summary_per_team
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams WHERE id = evaluation_summary_per_team.team_id AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Teamlid can view team summary" ON evaluation_summary_per_team
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id = evaluation_summary_per_team.team_id 
      AND id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );
