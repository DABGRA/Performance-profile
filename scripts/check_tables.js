const { Client } = require('pg')

const client = new Client({ connectionString: process.env.DATABASE_URL })

async function run() {
  await client.connect()
  console.log('[v0] Checking existing tables...')
  try {
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `)
    console.log('[v0] Tables found:', result.rows.map(r => r.table_name).join(', '))
  } catch (err) {
    console.error('[v0] Error:', err.message)
  } finally {
    await client.end()
  }
}

run()
