const { Client } = require('pg')
const { readFileSync, existsSync } = require('fs')
const { join } = require('path')

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

const client = new Client({ connectionString: process.env.DATABASE_URL })

async function run() {
  await client.connect()
  console.log('[v0] Fixing Psychological Safety questionnaire...')

  try {
    // 1. Update questionnaire definition: fix likert labels (inaccurate/accurate scale)
    //    and scoring_method. The score range stays 1-7.
    await client.query(`
      UPDATE questionnaire_definitions
      SET
        likert_labels = $1,
        scoring_method = 'average'
      WHERE questionnaire_key = 'psychological_safety'
    `, [JSON.stringify({
      1: 'Zeer onnauwkeurig',
      2: 'Onnauwkeurig',
      3: 'Enigszins onnauwkeurig',
      4: 'Noch onnauwkeurig noch nauwkeurig',
      5: 'Enigszins nauwkeurig',
      6: 'Nauwkeurig',
      7: 'Zeer nauwkeurig'
    })])
    console.log('[v0] Updated likert labels to inaccurate/accurate scale')

    // 2. Update all 7 question texts (EN official + NL back-translated) and fix is_reversed.
    //    is_reversed = true means: display scale REVERSED in UI (7 shown first → 1 last).
    //    No mathematical recode is applied — the stored value IS the correct score.
    const questions = [
      {
        n: 1, is_reversed: true,
        text_nl: 'Als je in dit team een fout maakt, wordt dat vaak tegen je gebruikt.',
        text_en: 'If you make a mistake in this team, it is often held against you.'
      },
      {
        n: 2, is_reversed: false,
        text_nl: 'Teamleden kunnen problemen en lastige kwesties bespreekbaar maken.',
        text_en: 'Members of this team are able to bring up problems and tough issues.'
      },
      {
        n: 3, is_reversed: true,
        text_nl: 'Mensen in dit team wijzen anderen soms af omdat ze anders zijn.',
        text_en: 'People on this team sometimes reject others for being different.'
      },
      {
        n: 4, is_reversed: false,
        text_nl: 'Het is veilig om in dit team een risico te nemen.',
        text_en: 'It is safe to take a risk in this team.'
      },
      {
        n: 5, is_reversed: true,
        text_nl: 'Het is moeilijk om andere teamleden om hulp te vragen.',
        text_en: 'It is difficult to ask other members of this team for help.'
      },
      {
        n: 6, is_reversed: false,
        text_nl: 'Niemand in dit team zou bewust op een manier handelen die mijn inspanningen ondermijnt.',
        text_en: 'No one on this team would deliberately act in a way that undermines my efforts.'
      },
      {
        n: 7, is_reversed: false,
        text_nl: 'In de samenwerking met teamleden worden mijn unieke vaardigheden en talenten gewaardeerd en benut.',
        text_en: 'Working with members of this team, my unique skills and talents are valued and utilized.'
      },
    ]

    // Get questionnaire id
    const res = await client.query(
      `SELECT id FROM questionnaire_definitions WHERE questionnaire_key = 'psychological_safety'`
    )
    if (res.rows.length === 0) {
      console.error('[v0] ERROR: psych_safety questionnaire not found')
      return
    }
    const qid = res.rows[0].id
    console.log('[v0] Found questionnaire id:', qid)

    for (const q of questions) {
      await client.query(`
        UPDATE questionnaire_questions
        SET
          question_text    = $1,
          question_text_en = $2,
          is_reversed      = $3
        WHERE questionnaire_id = $4
          AND question_number  = $5
      `, [q.text_nl, q.text_en, q.is_reversed, qid, q.n])
      console.log(`[v0] Updated Q${q.n}: reversed=${q.is_reversed}`)
    }

    console.log('[v0] Psychological Safety questionnaire fully updated.')
    console.log('[v0] Note: is_reversed=true means UI shows scale 7→1 (no math recode, stored value is already correct score)')

  } catch (err) {
    console.error('[v0] ERROR:', err.message)
  } finally {
    await client.end()
  }
}

run()
