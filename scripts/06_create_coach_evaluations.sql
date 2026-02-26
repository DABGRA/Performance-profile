-- Phase 1.6: Coach Performance Evaluations
-- Coach evaluates teamlid performance against performance goals

CREATE TABLE coach_performance_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  performance_goal_id UUID NOT NULL REFERENCES performance_goals(id) ON DELETE CASCADE,
  teamlid_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  period VARCHAR(10) NOT NULL, -- t0, t1, t2, ..., tx
  evaluation_score INT CHECK (evaluation_score >= 1 AND evaluation_score <= 10),
  coach_notes TEXT,
  data_sources JSONB, -- {butler_hardy: true, jones: false, gucciardi: true}
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(performance_goal_id, teamlid_id, period)
);

-- Indices
CREATE INDEX idx_coach_perf_eval_performance_goal_id ON coach_performance_evaluations(performance_goal_id);
CREATE INDEX idx_coach_perf_eval_teamlid_id ON coach_performance_evaluations(teamlid_id);
CREATE INDEX idx_coach_perf_eval_team_id ON coach_performance_evaluations(team_id);
CREATE INDEX idx_coach_perf_eval_period ON coach_performance_evaluations(period);

-- Enable RLS
ALTER TABLE coach_performance_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Coach can manage team evaluations" ON coach_performance_evaluations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams WHERE id = coach_performance_evaluations.team_id AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Teamlid can view own evaluations" ON coach_performance_evaluations
  FOR SELECT USING (auth.uid() = teamlid_id);

CREATE POLICY "Teamlid can view team average evaluations" ON coach_performance_evaluations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id = coach_performance_evaluations.team_id 
      AND id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );
