-- Phase 1.7: Dashboard Caching & Metrics
-- Pre-calculated metrics for dashboard performance

CREATE TABLE dashboard_team_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  period VARCHAR(10) NOT NULL,
  metric_type VARCHAR(100) NOT NULL, -- 'evaluation_trends', 'performance_goals_progress', 'outcome_goals_status'
  data JSONB NOT NULL,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, period, metric_type)
);

CREATE TABLE dashboard_individual_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teamlid_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  period VARCHAR(10) NOT NULL,
  profiler_progress JSONB, -- {butler_hardy: [...], jones: [...], gucciardi: [...]}
  evaluation_trend JSONB, -- {q1: [...], q2: [...], q3: [...]}
  coach_feedback_avg DECIMAL(5,2),
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(teamlid_id, team_id, period)
);

-- Indices
CREATE INDEX idx_dashboard_team_metrics_team_id ON dashboard_team_metrics(team_id);
CREATE INDEX idx_dashboard_team_metrics_period ON dashboard_team_metrics(period);
CREATE INDEX idx_dashboard_individual_metrics_teamlid_id ON dashboard_individual_metrics(teamlid_id);
CREATE INDEX idx_dashboard_individual_metrics_period ON dashboard_individual_metrics(period);

-- Enable RLS
ALTER TABLE dashboard_team_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_individual_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Coach can view team metrics" ON dashboard_team_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams WHERE id = dashboard_team_metrics.team_id AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Teamlid can view team metrics" ON dashboard_team_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id = dashboard_team_metrics.team_id 
      AND id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Teamlid can view own metrics" ON dashboard_individual_metrics
  FOR SELECT USING (auth.uid() = teamlid_id);

CREATE POLICY "Coach can view team member metrics" ON dashboard_individual_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams WHERE id = dashboard_individual_metrics.team_id AND coach_id = auth.uid()
    )
  );
