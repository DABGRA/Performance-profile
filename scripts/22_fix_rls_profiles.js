import pg from 'pg'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const { Client } = pg
const client = new Client({ connectionString: process.env.DATABASE_URL })

const sql = `
-- Drop all existing profiles policies first
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_superuser_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;

-- Simple non-recursive policies:
-- 1. Every authenticated user can read their own profile row
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- 2. Superuser access via JWT claim (no self-referencing query)
--    auth.jwt() ->> 'user_metadata' contains the role set at signup
CREATE POLICY "profiles_select_superuser"
  ON public.profiles FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'superuser'
  );

-- 3. Coach can read profiles of their team members
CREATE POLICY "profiles_select_coach"
  ON public.profiles FOR SELECT
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  );

-- 4. Own row update
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 5. Insert via trigger (service role only in practice)
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
`

async function run() {
  await client.connect()
  console.log('[v0] Fixing RLS profiles policies...')
  try {
    await client.query(sql)
    console.log('[v0] RLS profiles policies fixed!')
  } catch (err) {
    console.error('[v0] Error:', err.message)
  } finally {
    await client.end()
  }
}

run()
