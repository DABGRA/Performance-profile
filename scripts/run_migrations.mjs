import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const { Client } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))

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
      // Skip "already exists" errors so re-runs are safe
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
