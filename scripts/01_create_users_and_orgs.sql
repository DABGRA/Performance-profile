-- Phase 1.1: Users & Organizations Table
-- Base authentication and superuser organization management

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) NOT NULL CHECK (role IN ('superuser', 'coach', 'teamlid')),
  full_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  superuser_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_organizations_superuser_id ON organizations(superuser_id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own record" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Superuser can view all users in their org" ON users
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'superuser'
  );

-- RLS Policies for organizations table
CREATE POLICY "Superuser can view own organizations" ON organizations
  FOR SELECT USING (
    auth.jwt() ->> 'user_id'::uuid = superuser_id
  );

CREATE POLICY "Superuser can modify own organizations" ON organizations
  FOR ALL USING (
    auth.jwt() ->> 'user_id'::uuid = superuser_id
  );
