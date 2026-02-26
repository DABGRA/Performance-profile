-- Phase 1.4: Performance Profiling Tables
-- Butler & Hardy (Radar), Jones (Discrepancy), Gucciardi & Gordon (Bipolaire)

CREATE TABLE performance_profile_characteristics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  characteristic_name VARCHAR(255) NOT NULL, -- e.g., "Speed", "Strength", "Endurance"
  characteristic_order INT, -- 1-12 ordering
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(team_id, characteristic_name)
);

-- Butler & Hardy: Simple Radar (1-10 scale)
CREATE TABLE performance_profile_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teamlid_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  period VARCHAR(10) NOT NULL, -- t0, t1, t2, ..., tx
  method_type VARCHAR(50) DEFAULT 'butler_hardy',
  characteristic_id UUID NOT NULL REFERENCES performance_profile_characteristics(id) ON DELETE CASCADE,
  score INT CHECK (score >= 1 AND score <= 10),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  shared_with_coach BOOLEAN DEFAULT false,
  UNIQUE(teamlid_id, period, characteristic_id, method_type)
);

-- Jones: Advanced Discrepancy Scores
CREATE TABLE performance_profile_jones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teamlid_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  period VARCHAR(10) NOT NULL, -- t0, t1, t2, ..., tx
  method_type VARCHAR(50) DEFAULT 'jones',
  characteristic_id UUID NOT NULL REFERENCES performance_profile_characteristics(id) ON DELETE CASCADE,
  importance_rating INT CHECK (importance_rating >= 1 AND importance_rating <= 10),
  ideal_level INT CHECK (ideal_level >= 1 AND ideal_level <= 10),
  current_level INT CHECK (current_level >= 1 AND current_level <= 10),
  discrepancy_score INT GENERATED ALWAYS AS (ideal_level - current_level) STORED,
  priority_rank INT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  shared_with_coach BOOLEAN DEFAULT false,
  UNIQUE(teamlid_id, period, characteristic_id, method_type)
);

-- Gucciardi & Gordon: Bipolaire Scale (-3 to +3)
CREATE TABLE performance_profile_gucciardi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teamlid_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  period VARCHAR(10) NOT NULL, -- t0, t1, t2, ..., tx
  method_type VARCHAR(50) DEFAULT 'gucciardi_gordon',
  characteristic_name VARCHAR(255) NOT NULL,
  definition_positive TEXT,
  definition_negative TEXT,
  context_situation TEXT,
  score INT CHECK (score >= -3 AND score <= 3),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  shared_with_coach BOOLEAN DEFAULT false
);

-- Indices
CREATE INDEX idx_perf_prof_char_team_id ON performance_profile_characteristics(team_id);
CREATE INDEX idx_perf_prof_data_teamlid_id ON performance_profile_data(teamlid_id);
CREATE INDEX idx_perf_prof_data_team_id ON performance_profile_data(team_id);
CREATE INDEX idx_perf_prof_data_period ON performance_profile_data(period);
CREATE INDEX idx_perf_prof_jones_teamlid_id ON performance_profile_jones(teamlid_id);
CREATE INDEX idx_perf_prof_jones_period ON performance_profile_jones(period);
CREATE INDEX idx_perf_prof_gucciardi_teamlid_id ON performance_profile_gucciardi(teamlid_id);
CREATE INDEX idx_perf_prof_gucciardi_period ON performance_profile_gucciardi(period);

-- Enable RLS
ALTER TABLE performance_profile_characteristics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_profile_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_profile_jones ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_profile_gucciardi ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Teamlid owns their data, coach sees if shared
CREATE POLICY "Teamlid can view own profiler data" ON performance_profile_data
  FOR SELECT USING (auth.uid() = teamlid_id);

CREATE POLICY "Teamlid can manage own profiler data" ON performance_profile_data
  FOR ALL USING (auth.uid() = teamlid_id);

CREATE POLICY "Coach can view shared profiler data" ON performance_profile_data
  FOR SELECT USING (
    shared_with_coach = true 
    AND EXISTS (
      SELECT 1 FROM teams 
      WHERE id = performance_profile_data.team_id 
      AND coach_id = auth.uid()
    )
  );

-- Jones visibility
CREATE POLICY "Teamlid can view own jones data" ON performance_profile_jones
  FOR SELECT USING (auth.uid() = teamlid_id);

CREATE POLICY "Teamlid can manage own jones data" ON performance_profile_jones
  FOR ALL USING (auth.uid() = teamlid_id);

CREATE POLICY "Coach can view shared jones data" ON performance_profile_jones
  FOR SELECT USING (
    shared_with_coach = true 
    AND EXISTS (
      SELECT 1 FROM teams 
      WHERE id = performance_profile_jones.team_id 
      AND coach_id = auth.uid()
    )
  );

-- Gucciardi visibility
CREATE POLICY "Teamlid can view own gucciardi data" ON performance_profile_gucciardi
  FOR SELECT USING (auth.uid() = teamlid_id);

CREATE POLICY "Teamlid can manage own gucciardi data" ON performance_profile_gucciardi
  FOR ALL USING (auth.uid() = teamlid_id);

CREATE POLICY "Coach can view shared gucciardi data" ON performance_profile_gucciardi
  FOR SELECT USING (
    shared_with_coach = true 
    AND EXISTS (
      SELECT 1 FROM teams 
      WHERE id = performance_profile_gucciardi.team_id 
      AND coach_id = auth.uid()
    )
  );

-- Coach can view characteristic definitions
CREATE POLICY "Coach can view team characteristics" ON performance_profile_characteristics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams WHERE id = performance_profile_characteristics.team_id AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Teamlid can view team characteristics" ON performance_profile_characteristics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id = performance_profile_characteristics.team_id 
      AND id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    )
  );
