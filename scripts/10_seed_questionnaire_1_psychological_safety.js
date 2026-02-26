const { Client } = require('pg')
const { readFileSync, existsSync } = require('fs')
const { join } = require('path')

// Load .env.local
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

// ============================================================
// Vragenlijst 1: Psychologische Veiligheid
// Gebaseerd op Edmondson (1999)
// 7 vragen, 7-punts Likert schaal
// 3 vragen omgekeerd gescoord (recode: 8 - score)
// ============================================================

const questionnaire = {
  name: 'Psychologische Veiligheid',
  description: 'Meet de mate van psychologische veiligheid binnen een team. Gebaseerd op het werk van Amy Edmondson (1999). Psychologische veiligheid verwijst naar de gedeelde overtuiging dat het team veilig is voor interpersoonlijk risicovol gedrag.',
  version: 'v1.0',
  questionnaire_key: 'psychological_safety',
  total_questions: 7,
  likert_min: 1,
  likert_max: 7,
  scoring_method: 'average',
  has_special_chart: false,
  chart_type: 'line',
  is_active: true,
}

// Likert labels voor 7-punts schaal
// 1 = Helemaal mee oneens, 7 = Helemaal mee eens
// Recode: 8 - score (zodat 1 -> 7, 2 -> 6, etc.)

const questions = [
  {
    question_number: 1,
    question_text: 'Als je in dit team een fout maakt, wordt dat vaak tegen je gebruikt.',
    is_reversed: true,
    help_text: 'Omgekeerd gescoord: een lage score betekent meer psychologische veiligheid.',
  },
  {
    question_number: 2,
    question_text: 'Teamleden kunnen problemen en lastige kwesties bespreekbaar maken.',
    is_reversed: false,
    help_text: null,
  },
  {
    question_number: 3,
    question_text: 'Mensen in dit team wijzen anderen soms af omdat ze anders zijn.',
    is_reversed: true,
    help_text: 'Omgekeerd gescoord: een lage score betekent meer psychologische veiligheid.',
  },
  {
    question_number: 4,
    question_text: 'Het is veilig om in dit team een risico te nemen.',
    is_reversed: false,
    help_text: null,
  },
  {
    question_number: 5,
    question_text: 'Het is moeilijk om andere teamleden om hulp te vragen.',
    is_reversed: true,
    help_text: 'Omgekeerd gescoord: een lage score betekent meer psychologische veiligheid.',
  },
  {
    question_number: 6,
    question_text: 'Niemand in dit team zou bewust op een manier handelen die mijn inspanningen ondermijnt.',
    is_reversed: false,
    help_text: null,
  },
  {
    question_number: 7,
    question_text: 'In de samenwerking met teamleden worden mijn unieke vaardigheden en talenten gewaardeerd en benut.',
    is_reversed: false,
    help_text: null,
  },
]

async function run() {
  await client.connect()
  console.log('[v0] Seeding Vragenlijst 1: Psychologische Veiligheid...')

  try {
    // Check if already exists
    const existing = await client.query(
      `SELECT id FROM public.questionnaire_definitions WHERE questionnaire_key = $1 LIMIT 1`,
      [questionnaire.questionnaire_key]
    )

    let questionnaireId

    if (existing.rows.length > 0) {
      questionnaireId = existing.rows[0].id
      console.log(`[v0] Questionnaire already exists with id: ${questionnaireId}, updating...`)

      await client.query(
        `UPDATE public.questionnaire_definitions SET
          name = $1, description = $2, version = $3, total_questions = $4,
          likert_min = $5, likert_max = $6, scoring_method = $7,
          has_special_chart = $8, chart_type = $9, is_active = $10,
          updated_at = now()
        WHERE id = $11`,
        [
          questionnaire.name, questionnaire.description, questionnaire.version,
          questionnaire.total_questions, questionnaire.likert_min, questionnaire.likert_max,
          questionnaire.scoring_method, questionnaire.has_special_chart, questionnaire.chart_type,
          questionnaire.is_active, questionnaireId
        ]
      )
    } else {
      const result = await client.query(
        `INSERT INTO public.questionnaire_definitions
          (name, description, version, questionnaire_key, total_questions, likert_min, likert_max,
           scoring_method, has_special_chart, chart_type, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          questionnaire.name, questionnaire.description, questionnaire.version,
          questionnaire.questionnaire_key, questionnaire.total_questions,
          questionnaire.likert_min, questionnaire.likert_max, questionnaire.scoring_method,
          questionnaire.has_special_chart, questionnaire.chart_type, questionnaire.is_active
        ]
      )
      questionnaireId = result.rows[0].id
      console.log(`[v0] Created questionnaire with id: ${questionnaireId}`)
    }

    // Upsert questions
    for (const q of questions) {
      await client.query(
        `INSERT INTO public.questionnaire_questions
          (questionnaire_id, question_number, question_text, is_reversed, help_text, is_active)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (questionnaire_id, question_number)
         DO UPDATE SET
           question_text = EXCLUDED.question_text,
           is_reversed = EXCLUDED.is_reversed,
           help_text = EXCLUDED.help_text,
           is_active = EXCLUDED.is_active`,
        [questionnaireId, q.question_number, q.question_text, q.is_reversed, q.help_text]
      )
      console.log(`[v0] Upserted vraag ${q.question_number}: "${q.question_text.substring(0, 40)}..." (reversed: ${q.is_reversed})`)
    }

    console.log('[v0] ✓ Vragenlijst 1 succesvol geseed!')
    console.log('[v0]   - 7 vragen (3 omgekeerd gescoord)')
    console.log('[v0]   - 7-punts Likert: Helemaal mee oneens (1) t/m Helemaal mee eens (7)')
    console.log('[v0]   - Recode formule: 8 - score')
    console.log(`[v0]   - Questionnaire ID: ${questionnaireId}`)

  } catch (err) {
    console.error('[v0] Seed error:', err.message)
  } finally {
    await client.end()
  }
}

run()
