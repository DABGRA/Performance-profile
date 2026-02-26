-- Phase 1.3: Goal Hierarchy - Outcome, Performance, Process Goals
-- Hierarchical goal-setting with workshop sessions

CREATE TABLE goal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  session_type VARCHAR(50) NOT NULL CHECK (session_type IN ('outcome_goals', 'performance_goals', 'process_goals')),
  session_number INT,
  session_date DATE,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'concluded', 'approved')),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE outcome_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  goal_session_id UUID NOT NULL REFERENCES goal_sessions(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  timeline VARCHAR(255), -- e.g., "winterstop", "eind seizoen"
  subgroup_created_by VARCHAR(255), -- Subgroup name
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'presented', 'selected', 'approved')),
  presentation_order INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE performance_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outcome_goal_id UUID NOT NULL REFERENCES outcome_goals(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  performance_goal_session_id UUID NOT NULL REFERENCES goal_sessions(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  measurable_component TEXT, -- e.g., "30 pushups in 60 seconds"
  subgroup_created_by VARCHAR(255), -- Subgroup name
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'presented', 'selected', 'approved')),
  presentation_order INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE process_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  performance_goal_id UUID NOT NULL REFERENCES performance_goals(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task TEXT NOT NULL, -- What needs to be done
  assigned_role VARCHAR(255), -- Role/position
  context_situation TEXT, -- In which situation
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices
CREATE INDEX idx_goal_sessions_team_id ON goal_sessions(team_id);
CREATE INDEX idx_goal_sessions_created_by ON goal_sessions(created_by);
CREATE INDEX idx_outcome_goals_team_id ON outcome_goals(team_id);
CREATE INDEX idx_outcome_goals_goal_session_id ON outcome_goals(goal_session_id);
CREATE INDEX idx_performance_goals_outcome_goal_id ON performance_goals(outcome_goal_id);
CREATE INDEX idx_performance_goals_team_id ON performance_goals(team_id);
CREATE INDEX idx_process_goals_performance_goal_id ON process_goals(performance_goal_id);

-- Enable RLS
ALTER TABLE goal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE process_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Coach and Superuser only for goal management
CREATE POLICY "Coach can view team goal sessions" ON goal_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams WHERE id = goal_sessions.team_id AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Coach can manage goal sessions" ON goal_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams WHERE id = goal_sessions.team_id AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Teamlid can view goal sessions" ON goal_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id = goal_sessions.team_id 
      AND id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

-- Outcome goals visibility
CREATE POLICY "Coach can view outcome goals" ON outcome_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams WHERE id = outcome_goals.team_id AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Teamlid can view outcome goals" ON outcome_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id = outcome_goals.team_id 
      AND id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

-- Performance goals visibility
CREATE POLICY "Coach can view performance goals" ON performance_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams WHERE id = performance_goals.team_id AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Teamlid can view performance goals" ON performance_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id = performance_goals.team_id 
      AND id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );

-- Process goals visibility
CREATE POLICY "Coach can view process goals" ON process_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM performance_goals 
      WHERE id = process_goals.performance_goal_id
      AND EXISTS (
        SELECT 1 FROM teams WHERE id = performance_goals.team_id AND coach_id = auth.uid()
      )
    )
  );

CREATE POLICY "Teamlid can view process goals" ON process_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM performance_goals 
      WHERE id = process_goals.performance_goal_id
      AND EXISTS (
        SELECT 1 FROM teams 
        WHERE id = performance_goals.team_id 
        AND id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
      )
    )
  );
