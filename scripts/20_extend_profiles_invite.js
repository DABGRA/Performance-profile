const { Client } = require('pg')
require('dotenv').config({ path: '.env.local' })

const client = new Client({ connectionString: process.env.DATABASE_URL })

async function main() {
  await client.connect()

  await client.query(`
    ALTER TABLE public.profiles
      ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS invited_at timestamptz,
      ADD COLUMN IF NOT EXISTS onboarded boolean NOT NULL DEFAULT false;
  `)
  console.log('profiles table extended')

  // Update trigger to also capture team_id from metadata
  await client.query(`
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
      INSERT INTO public.profiles (id, email, full_name, role, team_id)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'teamlid'),
        (NEW.raw_user_meta_data->>'team_id')::uuid
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        team_id = COALESCE(EXCLUDED.team_id, public.profiles.team_id);
      RETURN NEW;
    END;
    $$;
  `)
  console.log('handle_new_user trigger updated')

  await client.end()
  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
