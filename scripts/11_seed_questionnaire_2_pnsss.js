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
// Vragenlijst 2: Psychologische Behoeften in Sport (PNSSS)
// Bhavsar et al. (2019)
// 29 vragen, 7-punts Likert
// 6 subscalen: 3 bevrediging + 3 frustratie
// GEEN individuele recode - frustratie items zijn eigen subscaal
//
// Vertaalmethode: EN -> NL -> EN terugvertaling -> correctie
// Doel: sportspecifiek, niet-letterlijk, natuurlijk Nederlands
// ============================================================

const questionnaire = {
  name: 'Psychologische Behoeften in Sport',
  description: 'Meet de mate waarin sporters bevrediging of frustratie ervaren van hun basispsychologische behoeften: autonomie, competentie en verbondenheid. Gebaseerd op Bhavsar et al. (2019). Hoge scores op bevrediging wijzen op positieve beleving; hoge scores op frustratie wijzen op belemmering.',
  version: 'v1.0',
  questionnaire_key: 'pnsss_psychological_needs',
  total_questions: 29,
  likert_min: 1,
  likert_max: 7,
  scoring_method: 'subscale_average',
  has_special_chart: true,
  chart_type: 'radar_dual',
  is_active: true,
}

// Likert labels (zelfde als PNSSS origineel)
const likertLabels = {
  1: 'Helemaal mee oneens',
  2: 'Mee oneens',
  3: 'Enigszins mee oneens',
  4: 'Neutraal',
  5: 'Enigszins mee eens',
  6: 'Mee eens',
  7: 'Helemaal mee eens',
}

// Subscale definities
// Scoring: gemiddelde van de items per subscaal
// Geen recode - frustratie-items zijn hoog als frustratie hoog is
const subscales = [
  {
    subscale_key: 'autonomy_satisfaction',
    name: 'Autonomiebevrediging',
    description: 'Mate waarin de sporter zich vrij voelt keuzes te maken en eigen doelen na te streven.',
    color: '#2563eb',
    question_numbers: [1, 7, 13, 19, 25],
    calculation: 'average',
  },
  {
    subscale_key: 'competence_satisfaction',
    name: 'Competentiebevrediging',
    description: 'Mate waarin de sporter zich bekwaam en effectief voelt.',
    color: '#16a34a',
    question_numbers: [3, 9, 15, 21, 27],
    calculation: 'average',
  },
  {
    subscale_key: 'relatedness_satisfaction',
    name: 'Verbondenheidbevrediging',
    description: 'Mate waarin de sporter zich verbonden, geaccepteerd en gesteund voelt.',
    color: '#9333ea',
    question_numbers: [5, 11, 17, 23, 28],
    calculation: 'average',
  },
  {
    subscale_key: 'autonomy_frustration',
    name: 'Autonomiefrustratie',
    description: 'Mate waarin de sporter druk ervaart om zich op een bepaalde manier te gedragen.',
    color: '#dc2626',
    question_numbers: [2, 8, 14, 20, 26],
    calculation: 'average',
  },
  {
    subscale_key: 'competence_frustration',
    name: 'Competentiefrustratie',
    description: 'Mate waarin de sporter zich onbekwaam, hopeloos of als een mislukking voelt.',
    color: '#ea580c',
    question_numbers: [4, 10, 16, 22],
    calculation: 'average',
  },
  {
    subscale_key: 'relatedness_frustration',
    name: 'Verbondenheidfrustratie',
    description: 'Mate waarin de sporter zich uitgesloten, genegeerd of niet serieus genomen voelt.',
    color: '#ca8a04',
    question_numbers: [6, 12, 18, 24, 29],
    calculation: 'average',
  },
]

// 29 vragen - sportspecifiek Nederlands
// Instructie: "In mijn hoofdsport..."
// Vertaalmethode: EN -> NL -> EN terugvertaling -> aanpassing op basis van verschil
const questions = [
  // --- Autonomiebevrediging (1, 7, 13, 19, 25) ---
  {
    question_number: 1,
    question_text: 'Voel ik me vrij om keuzes te maken over de manier waarop ik train.',
    subscale_key: 'autonomy_satisfaction',
    is_reversed: false,
    help_text: null,
  },
  {
    question_number: 7,
    question_text: 'Heb ik inbreng in hoe dingen worden gedaan.',
    subscale_key: 'autonomy_satisfaction',
    is_reversed: false,
    help_text: null,
  },
  {
    question_number: 13,
    question_text: 'Heb ik de vrijheid om mee te beslissen over trainingsinvulling.',
    subscale_key: 'autonomy_satisfaction',
    is_reversed: false,
    help_text: null,
  },
  {
    question_number: 19,
    question_text: 'Werk ik aan doelen die echt van mij zijn.',
    subscale_key: 'autonomy_satisfaction',
    is_reversed: false,
    help_text: 'Terugvertaling: "I work on goals that are truly my own" vs origineel "Pursue goals that are my own" - betekenis behouden, actiever geformuleerd.',
  },
  {
    question_number: 25,
    question_text: 'Voel ik me vrij om mezelf te zijn.',
    subscale_key: 'autonomy_satisfaction',
    is_reversed: false,
    help_text: null,
  },

  // --- Autonomiefrustratie (2, 8, 14, 20, 26) ---
  {
    question_number: 2,
    question_text: 'Voel ik druk om me op een bepaalde manier te gedragen.',
    subscale_key: 'autonomy_frustration',
    is_reversed: false,
    help_text: 'Terugvertaling: "I feel pressure to behave in a certain way" - "pushed" bewust zachter vertaald dan "forced", verschil behoudt intentie.',
  },
  {
    question_number: 8,
    question_text: 'Voel ik me gedwongen trainingsbeslissingen te volgen.',
    subscale_key: 'autonomy_frustration',
    is_reversed: false,
    help_text: null,
  },
  {
    question_number: 14,
    question_text: 'Voel ik me gedwongen trainingstaken uit te voeren die ik zelf niet zou kiezen.',
    subscale_key: 'autonomy_frustration',
    is_reversed: false,
    help_text: null,
  },
  {
    question_number: 20,
    question_text: 'Ervaar ik overmatige druk.',
    subscale_key: 'autonomy_frustration',
    is_reversed: false,
    help_text: null,
  },
  {
    question_number: 26,
    question_text: 'Moet ik doen wat me verteld wordt.',
    subscale_key: 'autonomy_frustration',
    is_reversed: false,
    help_text: null,
  },

  // --- Competentiebevrediging (3, 9, 15, 21, 27) ---
  {
    question_number: 3,
    question_text: 'Voel ik me bekwaam.',
    subscale_key: 'competence_satisfaction',
    is_reversed: false,
    help_text: 'Terugvertaling: "Feel that I am capable" - "capabel" vermeden, sportcontext vraagt om "bekwaam".',
  },
  {
    question_number: 9,
    question_text: 'Voel ik me vaardig.',
    subscale_key: 'competence_satisfaction',
    is_reversed: false,
    help_text: null,
  },
  {
    question_number: 15,
    question_text: 'Ben ik in staat uitdagingen te overwinnen.',
    subscale_key: 'competence_satisfaction',
    is_reversed: false,
    help_text: null,
  },
  {
    question_number: 21,
    question_text: 'Heb ik er vertrouwen in dat ik het goed kan doen.',
    subscale_key: 'competence_satisfaction',
    is_reversed: false,
    help_text: null,
  },
  {
    question_number: 27,
    question_text: 'Voel ik dat ik het goed doe.',
    subscale_key: 'competence_satisfaction',
    is_reversed: false,
    help_text: 'Terugvertaling: "Feel that I perform well" - "goed ben" is vaag, aangescherpt naar "goed doe" voor sportcontext.',
  },

  // --- Competentiefrustratie (4, 10, 16, 22) ---
  {
    question_number: 4,
    question_text: 'Heb ik het gevoel dat ik faal.',
    subscale_key: 'competence_frustration',
    is_reversed: false,
    help_text: 'Terugvertaling: "I feel like I am failing" - "mislukkeling" was te stigmatiserend, aangepast.',
  },
  {
    question_number: 10,
    question_text: 'Voel ik me nutteloos.',
    subscale_key: 'competence_frustration',
    is_reversed: false,
    help_text: null,
  },
  {
    question_number: 16,
    question_text: 'Voel ik me onbekwaam.',
    subscale_key: 'competence_frustration',
    is_reversed: false,
    help_text: 'Terugvertaling: "Feel incapable" - "niet in staat" was zwakker dan origineel, "onbekwaam" is preciezer.',
  },
  {
    question_number: 22,
    question_text: 'Voel ik me hopeloos.',
    subscale_key: 'competence_frustration',
    is_reversed: false,
    help_text: null,
  },

  // --- Verbondenheidbevrediging (5, 11, 17, 23, 28) ---
  {
    question_number: 5,
    question_text: 'Voel ik me gesteund.',
    subscale_key: 'relatedness_satisfaction',
    is_reversed: false,
    help_text: null,
  },
  {
    question_number: 11,
    question_text: 'Voel ik me echt gezien door de mensen om me heen.',
    subscale_key: 'relatedness_satisfaction',
    is_reversed: false,
    help_text: 'Terugvertaling: "Feel truly seen by the people around me" - "verzorgd" had fysieke connotatie, "echt gezien" treft emotionele betekenis beter.',
  },
  {
    question_number: 17,
    question_text: 'Voel ik me verbonden.',
    subscale_key: 'relatedness_satisfaction',
    is_reversed: false,
    help_text: null,
  },
  {
    question_number: 23,
    question_text: 'Voel ik me geaccepteerd.',
    subscale_key: 'relatedness_satisfaction',
    is_reversed: false,
    help_text: null,
  },
  {
    question_number: 28,
    question_text: 'Voel ik me prettig bij de mensen om me heen.',
    subscale_key: 'relatedness_satisfaction',
    is_reversed: false,
    help_text: 'Terugvertaling: "Feel comfortable around the people around me" - "mag de mensen" is onnatuurlijk Nederlands, aangepast.',
  },

  // --- Verbondenheidfrustratie (6, 12, 18, 24, 29) ---
  {
    question_number: 6,
    question_text: 'Voel ik me niet geaccepteerd door de mensen om me heen.',
    subscale_key: 'relatedness_frustration',
    is_reversed: false,
    help_text: 'Terugvertaling: "Feel not accepted by the people around me" - "niet gewild" had sterkere connotatie dan "disliked", aangepast.',
  },
  {
    question_number: 12,
    question_text: 'Voel ik me buitengesloten.',
    subscale_key: 'relatedness_frustration',
    is_reversed: false,
    help_text: null,
  },
  {
    question_number: 18,
    question_text: 'Voel ik me geïsoleerd.',
    subscale_key: 'relatedness_frustration',
    is_reversed: false,
    help_text: null,
  },
  {
    question_number: 24,
    question_text: 'Voel ik me genegeerd.',
    subscale_key: 'relatedness_frustration',
    is_reversed: false,
    help_text: null,
  },
  {
    question_number: 29,
    question_text: 'Voel ik me niet serieus genomen.',
    subscale_key: 'relatedness_frustration',
    is_reversed: false,
    help_text: 'Terugvertaling: "Feel not taken seriously" - "dismissed" is subtiel anders dan "rejected/afgewezen", "niet serieus genomen" treft de nuance beter.',
  },
]

async function run() {
  await client.connect()
  console.log('[v0] Seeding Vragenlijst 2: Psychologische Behoeften in Sport (PNSSS)...')

  try {
    // Upsert questionnaire definition
    const existing = await client.query(
      `SELECT id FROM public.questionnaire_definitions WHERE questionnaire_key = $1 LIMIT 1`,
      [questionnaire.questionnaire_key]
    )

    let questionnaireId

    if (existing.rows.length > 0) {
      questionnaireId = existing.rows[0].id
      console.log(`[v0] Questionnaire already exists (id: ${questionnaireId}), updating...`)
      await client.query(
        `UPDATE public.questionnaire_definitions SET
          name=$1, description=$2, version=$3, total_questions=$4,
          likert_min=$5, likert_max=$6, likert_labels=$7, scoring_method=$8,
          has_special_chart=$9, chart_type=$10, is_active=$11, updated_at=now()
        WHERE id=$12`,
        [
          questionnaire.name, questionnaire.description, questionnaire.version,
          questionnaire.total_questions, questionnaire.likert_min, questionnaire.likert_max,
          JSON.stringify(likertLabels), questionnaire.scoring_method,
          questionnaire.has_special_chart, questionnaire.chart_type,
          questionnaire.is_active, questionnaireId,
        ]
      )
    } else {
      const result = await client.query(
        `INSERT INTO public.questionnaire_definitions
          (name, description, version, questionnaire_key, total_questions,
           likert_min, likert_max, likert_labels, scoring_method,
           has_special_chart, chart_type, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING id`,
        [
          questionnaire.name, questionnaire.description, questionnaire.version,
          questionnaire.questionnaire_key, questionnaire.total_questions,
          questionnaire.likert_min, questionnaire.likert_max,
          JSON.stringify(likertLabels), questionnaire.scoring_method,
          questionnaire.has_special_chart, questionnaire.chart_type, questionnaire.is_active,
        ]
      )
      questionnaireId = result.rows[0].id
      console.log(`[v0] Created questionnaire with id: ${questionnaireId}`)
    }

    // Upsert subscales
    console.log('[v0] Seeding subscales...')
    const subscaleIds = {}
    for (const sub of subscales) {
      const existing_sub = await client.query(
        `SELECT id FROM public.questionnaire_subscales
         WHERE questionnaire_id=$1 AND subscale_key=$2 LIMIT 1`,
        [questionnaireId, sub.subscale_key]
      )
      let subId
      if (existing_sub.rows.length > 0) {
        subId = existing_sub.rows[0].id
        await client.query(
          `UPDATE public.questionnaire_subscales SET
            name=$1, description=$2, color=$3,
            question_numbers=$4, calculation=$5
          WHERE id=$6`,
          [sub.name, sub.description, sub.color,
           JSON.stringify(sub.question_numbers), sub.calculation, subId]
        )
      } else {
        const res = await client.query(
          `INSERT INTO public.questionnaire_subscales
            (questionnaire_id, subscale_key, name, description, color,
             question_numbers, calculation)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [questionnaireId, sub.subscale_key, sub.name, sub.description,
           sub.color, JSON.stringify(sub.question_numbers), sub.calculation]
        )
        subId = res.rows[0].id
      }
      subscaleIds[sub.subscale_key] = subId
      console.log(`[v0]   Subscale: ${sub.name} (${sub.question_numbers.length} vragen)`)
    }

    // Upsert questions
    console.log('[v0] Seeding questions...')
    for (const q of questions) {
      const subId = subscaleIds[q.subscale_key] ?? null
      await client.query(
        `INSERT INTO public.questionnaire_questions
          (questionnaire_id, subscale_id, question_number, question_text,
           is_reversed, help_text, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,true)
         ON CONFLICT (questionnaire_id, question_number)
         DO UPDATE SET
           subscale_id=EXCLUDED.subscale_id,
           question_text=EXCLUDED.question_text,
           is_reversed=EXCLUDED.is_reversed,
           help_text=EXCLUDED.help_text,
           is_active=EXCLUDED.is_active`,
        [questionnaireId, subId, q.question_number, q.question_text,
         q.is_reversed, q.help_text]
      )
    }

    console.log('[v0] ✓ Vragenlijst 2 succesvol geseed!')
    console.log(`[v0]   - 29 vragen verdeeld over 6 subscalen`)
    console.log('[v0]   - Bevrediging: Autonomie (5), Competentie (5), Verbondenheid (5)')
    console.log('[v0]   - Frustratie: Autonomie (5), Competentie (4), Verbondenheid (5)')
    console.log('[v0]   - Geen individuele recode - frustratie is eigen subscaal')
    console.log('[v0]   - has_special_chart=true, chart_type=radar_dual (later te bouwen)')
    console.log(`[v0]   - Questionnaire ID: ${questionnaireId}`)

  } catch (err) {
    console.error('[v0] Seed error:', err.message)
    console.error(err.stack)
  } finally {
    await client.end()
  }
}

run()
