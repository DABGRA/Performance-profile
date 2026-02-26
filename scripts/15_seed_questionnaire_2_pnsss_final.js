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
// Vragenlijst 2: PNSSS - Behoeftebevrediging en -frustratie in Sport
// Gebaseerd op Bhavsar et al. (2020)
// 29 vragen, 7-punts Likert schaal (1-7)
// 6 subscalen: 3 bevrediging + 3 frustratie
// Geen recodes - frustratie items zijn eigen subscaal
// ============================================================

const questionnaire = {
  name: 'Behoeftebevrediging en -frustratie in Sport',
  description: 'Meet de mate van bevrediging en frustratie van de drie basisbehoeften (autonomie, competentie, verbondenheid) in de sport. Gebaseerd op de Psychological Need States in Sport Scale (PNSSS, Bhavsar et al. 2020).',
  version: 'v1.0',
  questionnaire_key: 'pnsss',
  total_questions: 29,
  likert_min: 1,
  likert_max: 7,
  scoring_method: 'subscale_average',
  has_special_chart: true,
  chart_type: 'radar_dual',
  is_active: true,
}

// Subscales: key, name, display_order, color
const subscales = [
  { key: 'autonomy_sat',    name: 'Autonomiebevrediging',      display_order: 1, color: '#3B82F6', scoring_method: 'average' },
  { key: 'competence_sat',  name: 'Competentiebevrediging',    display_order: 2, color: '#10B981', scoring_method: 'average' },
  { key: 'relatedness_sat', name: 'Verbondenheidsbevrediging', display_order: 3, color: '#8B5CF6', scoring_method: 'average' },
  { key: 'autonomy_fru',    name: 'Autonomiefrustratie',       display_order: 4, color: '#EF4444', scoring_method: 'average' },
  { key: 'competence_fru',  name: 'Competentiefrustratie',     display_order: 5, color: '#F97316', scoring_method: 'average' },
  { key: 'relatedness_fru', name: 'Verbondenheidsfrustratie',  display_order: 6, color: '#F59E0B', scoring_method: 'average' },
]

// 29 vragen met subscale_key koppeling
const questions = [
  { n:  1, sub: 'autonomy_sat',    rev: false, nl: 'Voel me vrij om keuzes te maken over de manier waarop ik train.' },
  { n:  2, sub: 'autonomy_fru',    rev: false, nl: 'Voel druk om me op een bepaalde manier te gedragen.' },
  { n:  3, sub: 'competence_sat',  rev: false, nl: 'Voel me bekwaam.' },
  { n:  4, sub: 'competence_fru',  rev: false, nl: 'Heb het gevoel dat ik faal.' },
  { n:  5, sub: 'relatedness_sat', rev: false, nl: 'Voel me gesteund.' },
  { n:  6, sub: 'relatedness_fru', rev: false, nl: 'Voel me niet geaccepteerd door anderen.' },
  { n:  7, sub: 'autonomy_sat',    rev: false, nl: 'Heb inbreng in hoe dingen worden gedaan.' },
  { n:  8, sub: 'autonomy_fru',    rev: false, nl: 'Voel me gedwongen om trainingsbeslissingen te volgen.' },
  { n:  9, sub: 'competence_sat',  rev: false, nl: 'Voel me vaardig.' },
  { n: 10, sub: 'competence_fru',  rev: false, nl: 'Voel me nutteloos.' },
  { n: 11, sub: 'relatedness_sat', rev: false, nl: 'Voel me echt gezien door de mensen om me heen.' },
  { n: 12, sub: 'relatedness_fru', rev: false, nl: 'Voel me buitengesloten.' },
  { n: 13, sub: 'autonomy_sat',    rev: false, nl: 'Heb de vrijheid om trainingsbeslissingen te nemen.' },
  { n: 14, sub: 'autonomy_fru',    rev: false, nl: 'Voel me gedwongen trainingstaken uit te voeren die ik zelf niet zou kiezen.' },
  { n: 15, sub: 'competence_sat',  rev: false, nl: 'Ben in staat uitdagingen te overwinnen.' },
  { n: 16, sub: 'competence_fru',  rev: false, nl: 'Voel me onbekwaam.' },
  { n: 17, sub: 'relatedness_sat', rev: false, nl: 'Voel me verbonden.' },
  { n: 18, sub: 'relatedness_fru', rev: false, nl: 'Voel me geïsoleerd.' },
  { n: 19, sub: 'autonomy_sat',    rev: false, nl: 'Werk aan doelen die echt van mij zijn.' },
  { n: 20, sub: 'autonomy_fru',    rev: false, nl: 'Ervaar overmatige druk.' },
  { n: 21, sub: 'competence_sat',  rev: false, nl: 'Voel me zeker dat ik het goed kan doen.' },
  { n: 22, sub: 'competence_fru',  rev: false, nl: 'Voel me hopeloos.' },
  { n: 23, sub: 'relatedness_sat', rev: false, nl: 'Voel me geaccepteerd.' },
  { n: 24, sub: 'relatedness_fru', rev: false, nl: 'Voel me genegeerd.' },
  { n: 25, sub: 'autonomy_sat',    rev: false, nl: 'Voel dat ik mezelf kan zijn.' },
  { n: 26, sub: 'autonomy_fru',    rev: false, nl: 'Moet doen wat me verteld wordt.' },
  { n: 27, sub: 'competence_sat',  rev: false, nl: 'Voel dat ik het goed doe.' },
  { n: 28, sub: 'relatedness_sat', rev: false, nl: 'Voel me prettig bij de mensen om me heen.' },
  { n: 29, sub: 'relatedness_fru', rev: false, nl: 'Voel me niet serieus genomen.' },
]

async function run() {
  await client.connect()
  console.log('[v0] Seeding Vragenlijst 2: PNSSS...')

  try {
    // Upsert definitie
    const existing = await client.query(
      'SELECT id FROM public.questionnaire_definitions WHERE questionnaire_key = $1 LIMIT 1',
      [questionnaire.questionnaire_key]
    )

    let qId
    if (existing.rows.length > 0) {
      qId = existing.rows[0].id
      console.log('[v0] Updating existing questionnaire id:', qId)
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
      console.log('[v0] Created questionnaire id:', qId)
    }

    // Upsert subscales en sla ids op per key
    const subscaleIds = {}
    for (const s of subscales) {
      const sExist = await client.query(
        'SELECT id FROM public.questionnaire_subscales WHERE questionnaire_id=$1 AND subscale_key=$2 LIMIT 1',
        [qId, s.key]
      )
      if (sExist.rows.length > 0) {
        subscaleIds[s.key] = sExist.rows[0].id
        await client.query(
          `UPDATE public.questionnaire_subscales SET name=$1, display_order=$2, color=$3, scoring_method=$4 WHERE id=$5`,
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
      console.log('[v0] Subscale:', s.name, '-> id:', subscaleIds[s.key])
    }

    // Upsert vragen
    for (const q of questions) {
      const subId = subscaleIds[q.sub]
      await client.query(
        `INSERT INTO public.questionnaire_questions
          (questionnaire_id, subscale_id, question_number, question_text, is_reversed, is_active)
         VALUES ($1,$2,$3,$4,$5,true)
         ON CONFLICT (questionnaire_id, question_number)
         DO UPDATE SET
           subscale_id=EXCLUDED.subscale_id,
           question_text=EXCLUDED.question_text,
           is_reversed=EXCLUDED.is_reversed`,
        [qId, subId, q.n, q.nl, q.rev]
      )
      console.log('[v0] Vraag', q.n, '-', q.nl.substring(0, 45))
    }

    console.log('[v0] PNSSS succesvol geseed: 29 vragen, 6 subscalen')
  } catch (err) {
    console.error('[v0] Fout:', err.message)
    console.error(err.detail || '')
  } finally {
    await client.end()
  }
}

run()
