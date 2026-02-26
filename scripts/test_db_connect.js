const { Client } = require('pg')
const client = new Client({ connectionString: process.env.DATABASE_URL })
async function main() {
  await client.connect()
  console.log('[v0] DB connected OK')
  const r = await client.query('SELECT COUNT(*) FROM questionnaire_definitions')
  console.log('[v0] Questionnaire count:', r.rows[0].count)
  await client.end()
}
main().catch(e => { console.error('[v0] Error:', e.message); process.exit(1) })
