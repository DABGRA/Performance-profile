const { Client } = require('pg')

const client = new Client({ connectionString: process.env.DATABASE_URL })

async function run() {
  await client.connect()
  console.log('[v0] Checking columns per table...')
  try {
    const result = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `)
    const tables = {}
    for (const row of result.rows) {
      if (!tables[row.table_name]) tables[row.table_name] = []
      tables[row.table_name].push(`${row.column_name}:${row.data_type}`)
    }
    for (const [tbl, cols] of Object.entries(tables)) {
      console.log(`[v0] ${tbl}: ${cols.join(', ')}`)
    }
  } catch (err) {
    console.error('[v0] Error:', err.message)
  } finally {
    await client.end()
  }
}

run()
