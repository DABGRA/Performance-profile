-- Phase 1.2: Teams & Team Members
-- Coach organization and team member assignment

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  season_start DATE,
  season_end DATE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(team_id, user_id)
);

-- Indices
CREATE INDEX idx_teams_organization_id ON teams(organization_id);
CREATE INDEX idx_teams_coach_id ON teams(coach_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Coach can view own teams" ON teams
  FOR SELECT USING (auth.uid() = coach_id);

CREATE POLICY "Teamlid can view own teams" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members 
      WHERE team_id = teams.id 
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

-- RLS Policies for team_members
CREATE POLICY "Coach can manage team members" ON team_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id = team_members.team_id 
      AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Teamlid can view team members" ON team_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams 
      WHERE id = team_members.team_id 
      AND id IN (
        SELECT team_id FROM team_members 
        WHERE user_id = auth.uid()
      )
    )
  );
