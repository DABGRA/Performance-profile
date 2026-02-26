import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local
try {
  const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  env.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=')
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
  })
} catch {}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function main() {
  // Check auth users metadata
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  if (error) { console.error('listUsers error:', error); process.exit(1) }

  const testEmails = ['superuser@performanceprofiel.nl', 'coach@performanceprofiel.nl', 'sporter@performanceprofiel.nl']
  const testUsers = users.filter(u => testEmails.includes(u.email))

  console.log('\n=== Auth Users ===')
  testUsers.forEach(u => {
    console.log(`${u.email} | confirmed: ${u.email_confirmed_at ? 'yes' : 'NO'} | metadata:`, u.user_metadata)
  })

  // Check profiles table
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, team_id, invited_by, onboarded')
    .in('email', testEmails)

  console.log('\n=== Profiles Table ===')
  if (pErr) console.error('profiles error:', pErr)
  else console.log(profiles)

  // Check if profiles exist at all
  const { data: allProfiles, count } = await supabase
    .from('profiles')
    .select('id, email, role', { count: 'exact' })
    .limit(10)
  console.log(`\n=== All profiles (count: ${count}) ===`)
  console.log(allProfiles)
}

main()
