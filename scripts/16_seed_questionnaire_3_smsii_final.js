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

// ============================================================
// Vragenlijst 3: SMS-II - Sportmotivatieschaal
// Gebaseerd op Pelletier et al. (2013)
// 18 vragen, 7-punts Likert schaal (1-7)
// 6 subscalen op het motivatiecontinuum (amotivatie -> intrinsiek)
// Geen recodes
// Speciale grafiek: motivation_continuum
// ============================================================

const questionnaire = {
  name: 'Sportmotivatieschaal',
  description: 'Meet de kwaliteit van motivatie in de sport op basis van de zelfdeterminatietheorie. Zes subscalen van amotivatie tot intrinsieke motivatie op een continuüm.',
  version: '2.0',
  questionnaire_key: 'sms_ii',
  total_questions: 18,
  likert_min: 1,
  likert_max: 7,
  scoring_method: 'subscale_average',
  has_special_chart: true,
  chart_type: 'motivation_continuum',
  is_active: true,
}

const subscales = [
  { key: 'amotivation',      name: 'Amotivatie',                   display_order: 1, color: '#6B7280', scoring_method: 'average' },
  { key: 'external_reg',     name: 'Externe regulatie',            display_order: 2, color: '#EF4444', scoring_method: 'average' },
  { key: 'introjected_reg',  name: 'Geintrojeerde regulatie',      display_order: 3, color: '#F97316', scoring_method: 'average' },
  { key: 'identified_reg',   name: 'Geidentificeerde regulatie',   display_order: 4, color: '#EAB308', scoring_method: 'average' },
  { key: 'integrated_reg',   name: 'Geintegreerde regulatie',      display_order: 5, color: '#3B82F6', scoring_method: 'average' },
  { key: 'intrinsic_mot',    name: 'Intrinsieke motivatie',        display_order: 6, color: '#10B981', scoring_method: 'average' },
]

const questions = [
  { n:  1, sub: 'introjected_reg', nl: 'Omdat ik me slecht zou voelen over mezelf als ik er geen tijd aan zou besteden.' },
  { n:  2, sub: 'amotivation',     nl: 'Ik had vroeger goede redenen om te sporten, maar nu vraag ik me af of ik door moet gaan.' },
  { n:  3, sub: 'intrinsic_mot',   nl: 'Omdat het erg interessant is om te leren hoe ik me kan verbeteren.' },
  { n:  4, sub: 'integrated_reg',  nl: 'Omdat sporten de kern weerspiegelt van wie ik ben.' },
  { n:  5, sub: 'external_reg',    nl: 'Omdat mensen die belangrijk voor me zijn het niet fijn zouden vinden als ik het niet deed.' },
  { n:  6, sub: 'identified_reg',  nl: 'Omdat ik heb ontdekt dat het een goede manier is om aspecten van mezelf te ontwikkelen die ik waardeer.' },
  { n:  7, sub: 'introjected_reg', nl: 'Omdat ik het gevoel zou krijgen dat ik er niet toe doe als ik het niet deed.' },
  { n:  8, sub: 'external_reg',    nl: 'Omdat ik denk dat anderen me zouden afkeuren als ik het niet deed.' },
  { n:  9, sub: 'intrinsic_mot',   nl: 'Omdat ik het leuk vind om nieuwe prestatiestrategieën te ontdekken.' },
  { n: 10, sub: 'amotivation',     nl: 'Ik weet het niet meer; ik heb het gevoel dat ik niet in staat ben om te slagen in deze sport.' },
  { n: 11, sub: 'integrated_reg',  nl: 'Omdat sporten een integraal onderdeel van mijn leven is.' },
  { n: 12, sub: 'identified_reg',  nl: 'Omdat ik deze sport heb gekozen als een manier om mezelf te ontwikkelen.' },
  { n: 13, sub: 'amotivation',     nl: 'Het is me niet meer duidelijk; ik denk niet echt dat mijn plek in de sport is.' },
  { n: 14, sub: 'integrated_reg',  nl: 'Omdat ik door sport leef volgens wat echt belangrijk voor me is.' },
  { n: 15, sub: 'external_reg',    nl: 'Omdat mensen om me heen me belonen als ik sport.' },
  { n: 16, sub: 'introjected_reg', nl: 'Omdat ik me beter over mezelf voel als ik sport.' },
  { n: 17, sub: 'intrinsic_mot',   nl: 'Omdat het me plezier geeft om meer te leren over mijn sport.' },
  { n: 18, sub: 'identified_reg',  nl: 'Omdat het een van de beste manieren is die ik heb gekozen om andere aspecten van mezelf te ontwikkelen.' },
]

async function run() {
  await client.connect()
  console.log('[v0] Seeding Vragenlijst 3: SMS-II Sportmotivatieschaal...')

  try {
    const existing = await client.query(
      'SELECT id FROM public.questionnaire_definitions WHERE questionnaire_key = $1 LIMIT 1',
      [questionnaire.questionnaire_key]
    )

    let qId
    if (existing.rows.length > 0) {
      qId = existing.rows[0].id
      console.log('[v0] Updating existing SMS-II id:', qId)
      await client.query(
        `UPDATE public.questionnaire_definitions SET
          name=$1, description=$2, version=$3, total_questions=$4,
          likert_min=$5, likert_max=$6, scoring_method=$7,
          has_special_chart=$8, chart_type=$9, is_active=$10, updated_at=now()
         WHERE id=$11`,
        [questionnaire.name, questionnaire.description, questionnaire.version,
         questionnaire.total_questions, questionnaire.likert_min, questionnaire.likert_max,
         questionnaire.scoring_method, questionnaire.has_special_chart, questionnaire.chart_type,
         questionnaire.is_active, qId]
      )
    } else {
      const res = await client.query(
        `INSERT INTO public.questionnaire_definitions
          (name, description, version, questionnaire_key, total_questions,
           likert_min, likert_max, scoring_method, has_special_chart, chart_type, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        [questionnaire.name, questionnaire.description, questionnaire.version,
         questionnaire.questionnaire_key, questionnaire.total_questions,
         questionnaire.likert_min, questionnaire.likert_max, questionnaire.scoring_method,
         questionnaire.has_special_chart, questionnaire.chart_type, questionnaire.is_active]
      )
      qId = res.rows[0].id
      console.log('[v0] Created SMS-II id:', qId)
    }

    // Subscales
    const subscaleIds = {}
    for (const s of subscales) {
      const sEx = await client.query(
        'SELECT id FROM public.questionnaire_subscales WHERE questionnaire_id=$1 AND subscale_key=$2 LIMIT 1',
        [qId, s.key]
      )
      if (sEx.rows.length > 0) {
        subscaleIds[s.key] = sEx.rows[0].id
        await client.query(
          'UPDATE public.questionnaire_subscales SET name=$1, display_order=$2, color=$3, scoring_method=$4 WHERE id=$5',
          [s.name, s.display_order, s.color, s.scoring_method, subscaleIds[s.key]]
        )
      } else {
        const sRes = await client.query(
          `INSERT INTO public.questionnaire_subscales
            (questionnaire_id, subscale_key, name, display_order, color, scoring_method)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [qId, s.key, s.name, s.display_order, s.color, s.scoring_method]
        )
        subscaleIds[s.key] = sRes.rows[0].id
      }
      console.log('[v0] Subscale:', s.name)
    }

    // Vragen
    for (const q of questions) {
      const subId = subscaleIds[q.sub]
      await client.query(
        `INSERT INTO public.questionnaire_questions
          (questionnaire_id, subscale_id, question_number, question_text, is_reversed, is_active)
         VALUES ($1,$2,$3,$4,false,true)
         ON CONFLICT (questionnaire_id, question_number)
         DO UPDATE SET
           subscale_id=EXCLUDED.subscale_id,
           question_text=EXCLUDED.question_text,
           is_reversed=EXCLUDED.is_reversed`,
        [qId, subId, q.n, q.nl]
      )
      console.log('[v0] Vraag', q.n, '-', q.nl.substring(0, 50))
    }

    console.log('[v0] SMS-II succesvol geseed: 18 vragen, 6 subscalen op motivatiecontinuum')
  } catch (err) {
    console.error('[v0] Fout:', err.message)
    console.error(err.detail || '')
  } finally {
    await client.end()
  }
}

run()
