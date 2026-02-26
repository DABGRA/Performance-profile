const { Client } = require('pg')
const { readFileSync, existsSync } = require('fs')
const { join } = require('path')

const envPath = join(__dirname, '..', '.env.local')
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const eqIndex = line.indexOf('=')
    if (eqIndex > 0) process.env[line.substring(0, eqIndex).trim()] = line.substring(eqIndex + 1).trim()
  })
}

const client = new Client({ connectionString: process.env.DATABASE_URL })

async function run() {
  await client.connect()
  try {
    const res = await client.query(`
      SELECT qd.name, qq.question_number, qq.text_nl, qq.text_en, qq.is_reversed
      FROM questionnaire_questions qq
      JOIN questionnaire_definitions qd ON qd.id = qq.questionnaire_id
      ORDER BY qd.name, qq.question_number
    `)
    let current = ''
    for (const r of res.rows) {
      if (r.name !== current) { console.log('[v0] ---', r.name, '---'); current = r.name }
      console.log(`[v0] Q${r.question_number} | reversed:${r.is_reversed} | NL: ${r.text_nl?.substring(0, 50)} | EN: ${r.text_en?.substring(0, 50) ?? 'NULL'}`)
    }
  } catch (e) {
    console.error('[v0] Error:', e.message)
  } finally {
    await client.end()
  }
}
run()
