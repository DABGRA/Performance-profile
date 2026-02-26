const { Client } = require('pg')

const client = new Client({ connectionString: process.env.DATABASE_URL })

const sql = `
  ALTER TABLE public.questionnaire_definitions
    ADD COLUMN IF NOT EXISTS likert_labels JSONB DEFAULT NULL;

  -- Also update the existing Psychologische Veiligheid questionnaire
  UPDATE public.questionnaire_definitions
  SET likert_labels = '{"1":"Helemaal mee oneens","2":"Mee oneens","3":"Enigszins mee oneens","4":"Neutraal","5":"Enigszins mee eens","6":"Mee eens","7":"Helemaal mee eens"}'::jsonb
  WHERE name = 'Psychologische Veiligheid';
`

async function run() {
  await client.connect()
  console.log('[v0] Adding likert_labels column to questionnaire_definitions...')
  try {
    await client.query(sql)
    console.log('[v0] Column added and Questionnaire 1 labels updated successfully.')
  } catch (err) {
    console.error('[v0] Error:', err.message)
  } finally {
    await client.end()
  }
}

run()
