import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkAndFixUsers() {
  const emails = [
    'superuser@performanceprofiel.nl',
    'coach@performanceprofiel.nl',
    'sporter@performanceprofiel.nl',
  ]

  for (const email of emails) {
    // Get user from auth
    const { data: { users }, error } = await supabase.auth.admin.listUsers()
    if (error) { console.error('listUsers error:', error); continue }

    const user = users.find(u => u.email === email)
    if (!user) { console.log(`NOT FOUND: ${email}`); continue }

    console.log(`\n--- ${email} ---`)
    console.log('user_metadata:', JSON.stringify(user.user_metadata))
    console.log('email_confirmed_at:', user.email_confirmed_at)

    // Check profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) console.log('profile error:', profileError.message)
    else console.log('profile:', JSON.stringify(profile))
  }
}

checkAndFixUsers().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
