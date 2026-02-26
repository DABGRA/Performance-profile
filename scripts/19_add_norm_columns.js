const { Client } = require('pg')
const { readFileSync, existsSync } = require('fs')
const { join } = require('path')

// Load .env.local
const envPath = join(__dirname, '..', '.env.local')
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
  }
}

const client = new Client({ connectionString: process.env.DATABASE_URL })

async function main() {
  await client.connect()
  console.log('Connected to database')

  // Add norm columns to questionnaire_definitions
  await client.query(`
    ALTER TABLE questionnaire_definitions
      ADD COLUMN IF NOT EXISTS norm_mean NUMERIC(6,3),
      ADD COLUMN IF NOT EXISTS norm_sd   NUMERIC(6,3),
      ADD COLUMN IF NOT EXISTS norm_source TEXT,
      ADD COLUMN IF NOT EXISTS has_external_norm BOOLEAN NOT NULL DEFAULT false
  `)
  console.log('Added norm columns to questionnaire_definitions')

  // Also add z_score and p_value to evaluation_team_summaries
  await client.query(`
    ALTER TABLE evaluation_team_summaries
      ADD COLUMN IF NOT EXISTS z_score  NUMERIC(8,4),
      ADD COLUMN IF NOT EXISTS p_value  NUMERIC(8,6),
      ADD COLUMN IF NOT EXISTS u3_vs_norm NUMERIC(6,2)
  `)
  console.log('Added z_score, p_value, u3_vs_norm to evaluation_team_summaries')

  // Set Edmondson norm on psychological_safety
  const { rows } = await client.query(
    `SELECT id FROM questionnaire_definitions WHERE questionnaire_key = 'psychological_safety' LIMIT 1`
  )
  if (rows.length === 0) {
    console.log('WARNING: psychological_safety questionnaire not found')
  } else {
    await client.query(`
      UPDATE questionnaire_definitions
      SET
        norm_mean          = 4.6,
        norm_sd            = 0.5,
        norm_source        = 'Edmondson (1999)',
        has_external_norm  = true
      WHERE id = $1
    `, [rows[0].id])
    console.log(`Set Edmondson norm (mean=4.6, SD=0.5) on questionnaire id ${rows[0].id}`)
  }

  await client.end()
  console.log('Done.')
}

main().catch(err => { console.error(err); process.exit(1) })
