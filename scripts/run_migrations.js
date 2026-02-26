const { readFileSync, existsSync } = require('fs')
const { join } = require('path')
const { Client } = require('pg')

// Load .env.local or .env if present
const envFiles = ['.env.local', '.env']
for (const envFile of envFiles) {
  const envPath = join(__dirname, '..', envFile)
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf-8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...rest] = trimmed.split('=')
        if (key && rest.length > 0) {
          process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '')
        }
      }
    }
    console.log(`[v0] Loaded env vars from ${envFile}`)
    break
  }
}

console.log('[v0] DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 30))

const migrations = [
  '01_create_users_and_orgs.sql',
  '02_create_teams_and_members.sql',
  '03_create_goal_hierarchy.sql',
  '04_create_performance_profiles.sql',
  '05_create_evaluations.sql',
  '06_create_coach_evaluations.sql',
  '07_create_dashboard_metrics.sql',
]

async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()
  console.log('[v0] Connected to Supabase database')

  for (const file of migrations) {
    const filePath = join(__dirname, file)
    const sql = readFileSync(filePath, 'utf-8')
    console.log(`[v0] Running migration: ${file}`)
    try {
      await client.query(sql)
      console.log(`[v0] Done: ${file}`)
    } catch (err) {
      if (
        err.message.includes('already exists') ||
        err.message.includes('duplicate')
      ) {
        console.log(`[v0] Skipped (already exists): ${file}`)
      } else {
        console.error(`[v0] Error in ${file}:`, err.message)
        await client.end()
        process.exit(1)
      }
    }
  }

  await client.end()
  console.log('[v0] All migrations completed successfully')
}

runMigrations()
