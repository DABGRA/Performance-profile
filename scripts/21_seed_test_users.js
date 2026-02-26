const { readFileSync, existsSync } = require('fs')
const { join } = require('path')

// Load .env.local
const envPath = join(__dirname, '..', '.env.local')
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim()
        const value = trimmed.substring(eqIndex + 1).trim().replace(/^["']|["']$/g, '')
        process.env[key] = value
      }
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function createUser({ email, password, full_name, role, team_id }) {
  const url = `${SUPABASE_URL}/auth/v1/admin/users`

  const body = {
    email,
    password,
    email_confirm: true, // skip email confirmation voor testgebruikers
    user_metadata: {
      full_name,
      role,
      ...(team_id ? { team_id } : {}),
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  if (!res.ok) {
    // Als user al bestaat, gewoon doorgaan
    if (data.msg && data.msg.includes('already been registered')) {
      console.log(`  [al aanwezig] ${email}`)
      return null
    }
    console.error(`  [fout] ${email}:`, data)
    return null
  }

  console.log(`  [aangemaakt] ${email} (id: ${data.id})`)
  return data
}

async function main() {
  console.log('Testgebruikers aanmaken...\n')

  // 1. Superuser
  console.log('1. Superuser')
  await createUser({
    email: 'superuser@performanceprofiel.nl',
    password: 'Test1234!',
    full_name: 'Super User',
    role: 'superuser',
  })

  // 2. Coach
  console.log('2. Coach')
  await createUser({
    email: 'coach@performanceprofiel.nl',
    password: 'Test1234!',
    full_name: 'Coach Demo',
    role: 'coach',
  })

  // 3. Teamlid (Sporter)
  console.log('3. Teamlid (Sporter)')
  await createUser({
    email: 'sporter@performanceprofiel.nl',
    password: 'Test1234!',
    full_name: 'Sporter Demo',
    role: 'teamlid',
  })

  console.log('\nKlaar. Inloggegevens:')
  console.log('---------------------------------------------')
  console.log('Superuser  : superuser@performanceprofiel.nl  /  Test1234!')
  console.log('Coach      : coach@performanceprofiel.nl      /  Test1234!')
  console.log('Sporter    : sporter@performanceprofiel.nl    /  Test1234!')
  console.log('---------------------------------------------')
}

main().catch(e => { console.error(e); process.exit(1) })
