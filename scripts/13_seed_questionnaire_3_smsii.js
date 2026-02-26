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
// Vragenlijst 3: Sportmotivatieschaal II (SMS-II)
// Pelletier et al. (2013)
// 18 vragen, 7-punts Likert
// 6 subscalen x 3 vragen — geen recodes
// Speciale grafiek: motivatiecontinuüm (amotivatie → extern → introject → geidentificeerd → geintegreerd → intrinsiek)
//
// Scoring:
// Intrinsieke motivatie:        3, 9, 17
// Geintegreerde regulatie:      4, 11, 14
// Geidentificeerde regulatie:   6, 12, 18
// Geintrojeerde regulatie:      1, 7, 16
// Externe regulatie:            5, 8, 15
// Amotivatie:                   2, 10, 13
//
// Likert: 1 = Komt helemaal niet overeen ... 7 = Komt volledig overeen
// ============================================================

async function run() {
  await client.connect()
  console.log('[v0] Connected to database')

  try {
    // 1. Maak vragenlijst definitie aan
    const defResult = await client.query(`
      INSERT INTO questionnaire_definitions (
        name, description, version, is_active,
        likert_min, likert_max, likert_labels,
        scoring_method, has_special_chart, chart_type
      ) VALUES (
        'Sportmotivatieschaal',
        'Meet de kwaliteit van motivatie in de sport op basis van de zelfdeterminatietheorie. Zes subscalen van amotivatie tot intrinsieke motivatie.',
        '2.0',
        true,
        1, 7,
        '{"1":"Komt helemaal niet overeen","2":"Komt nauwelijks overeen","3":"Komt een beetje overeen","4":"Komt redelijk overeen","5":"Komt behoorlijk overeen","6":"Komt grotendeels overeen","7":"Komt volledig overeen"}',
        'subscale_average',
        true,
        'motivation_continuum'
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `)

    let defId
    if (defResult.rows.length === 0) {
      const existing = await client.query(
        `SELECT id FROM questionnaire_definitions WHERE name = 'Sportmotivatieschaal' AND version = '2.0'`
      )
      defId = existing.rows[0].id
      console.log('[v0] Definition already exists, using id:', defId)
    } else {
      defId = defResult.rows[0].id
      console.log('[v0] Created definition with id:', defId)
    }

    // 2. Subscalen aanmaken
    // Volgorde op het continuum: amotivatie (minst zelfbepaald) → intrinsiek (meest zelfbepaald)
    const subscales = [
      {
        name: 'Amotivatie',
        description: 'Geen reden meer om te sporten, gevoel van onbekwaamheid of zinloosheid',
        question_numbers: [2, 10, 13],
        calculation: 'average',
        color: '#94a3b8', // grijs
        display_order: 1,
      },
      {
        name: 'Externe regulatie',
        description: 'Sport omwille van externe beloningen of om straf/afkeuring te vermijden',
        question_numbers: [5, 8, 15],
        calculation: 'average',
        color: '#f87171', // rood
        display_order: 2,
      },
      {
        name: 'Geintrojeerde regulatie',
        description: 'Sport om zelfkritiek of schuldgevoel te vermijden, innerlijke druk',
        question_numbers: [1, 7, 16],
        calculation: 'average',
        color: '#fb923c', // oranje
        display_order: 3,
      },
      {
        name: 'Geidentificeerde regulatie',
        description: 'Sport omdat men de waarde ervan inziet voor persoonlijke ontwikkeling',
        question_numbers: [6, 12, 18],
        calculation: 'average',
        color: '#facc15', // geel
        display_order: 4,
      },
      {
        name: 'Geintegreerde regulatie',
        description: 'Sport is een integraal onderdeel van de persoonlijke identiteit en waarden',
        question_numbers: [4, 11, 14],
        calculation: 'average',
        color: '#4ade80', // lichtgroen
        display_order: 5,
      },
      {
        name: 'Intrinsieke motivatie',
        description: 'Sport om de inherente vreugde en interesse in leren en verbeteren',
        question_numbers: [3, 9, 17],
        calculation: 'average',
        color: '#22c55e', // groen
        display_order: 6,
      },
    ]

    for (const sub of subscales) {
      await client.query(`
        INSERT INTO questionnaire_subscales (
          questionnaire_id, name, description,
          question_numbers, calculation, color, display_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING
      `, [defId, sub.name, sub.description, JSON.stringify(sub.question_numbers), sub.calculation, sub.color, sub.display_order])
      console.log('[v0] Subscale:', sub.name)
    }

    // 3. Vragen aanmaken (geen recodes - alle items positief gescoord)
    const questions = [
      {
        n: 1, subscale: 'Geintrojeerde regulatie', is_reversed: false,
        text_nl: 'Omdat ik me slecht over mezelf zou voelen als ik er geen tijd aan zou besteden.',
        text_en: 'Because I would feel bad about myself if I did not take the time to do it.',
      },
      {
        n: 2, subscale: 'Amotivatie', is_reversed: false,
        text_nl: 'Ik had vroeger goede redenen om te sporten, maar nu vraag ik me af of ik door moet gaan.',
        text_en: 'I used to have good reasons for doing sports, but now I am asking myself if I should continue.',
      },
      {
        n: 3, subscale: 'Intrinsieke motivatie', is_reversed: false,
        text_nl: 'Omdat het erg interessant is om te leren hoe ik me kan verbeteren.',
        text_en: 'Because it is very interesting to learn how I can improve.',
      },
      {
        n: 4, subscale: 'Geintegreerde regulatie', is_reversed: false,
        text_nl: 'Omdat sporten de kern weerspiegelt van wie ik ben.',
        text_en: 'Because practicing sports reflects the essence of whom I am.',
      },
      {
        n: 5, subscale: 'Externe regulatie', is_reversed: false,
        text_nl: 'Omdat mensen die belangrijk voor me zijn het niet fijn zouden vinden als ik het niet deed.',
        text_en: 'Because people I care about would be upset with me if I didn\'t.',
      },
      {
        n: 6, subscale: 'Geidentificeerde regulatie', is_reversed: false,
        text_nl: 'Omdat het een goede manier is om aspecten van mezelf te ontwikkelen die ik waardeer.',
        text_en: 'Because I found it is a good way to develop aspects of myself that I value.',
      },
      {
        n: 7, subscale: 'Geintrojeerde regulatie', is_reversed: false,
        text_nl: 'Omdat ik het gevoel zou krijgen dat ik er niet toe doe als ik het niet deed.',
        text_en: 'Because I would not feel worthwhile if I did not.',
      },
      {
        n: 8, subscale: 'Externe regulatie', is_reversed: false,
        text_nl: 'Omdat ik denk dat anderen me zouden afkeuren als ik het niet deed.',
        text_en: 'Because I think others would disapprove of me if I did not.',
      },
      {
        n: 9, subscale: 'Intrinsieke motivatie', is_reversed: false,
        text_nl: 'Omdat ik het leuk vind om nieuwe prestatiestrategieën te ontdekken.',
        text_en: 'Because I find it enjoyable to discover new performance strategies.',
      },
      {
        n: 10, subscale: 'Amotivatie', is_reversed: false,
        text_nl: 'Ik weet het niet meer; ik heb het gevoel dat ik niet in staat ben om te slagen in deze sport.',
        text_en: 'I don\'t know anymore; I have the impression that I am incapable of succeeding in this sport.',
      },
      {
        n: 11, subscale: 'Geintegreerde regulatie', is_reversed: false,
        text_nl: 'Omdat sporten een integraal onderdeel van mijn leven is.',
        text_en: 'Because participating in sport is an integral part of my life.',
      },
      {
        n: 12, subscale: 'Geidentificeerde regulatie', is_reversed: false,
        text_nl: 'Omdat ik deze sport heb gekozen als een manier om mezelf te ontwikkelen.',
        text_en: 'Because I have chosen this sport as a way to develop myself.',
      },
      {
        n: 13, subscale: 'Amotivatie', is_reversed: false,
        text_nl: 'Het is me niet meer duidelijk; ik denk niet echt dat mijn plek in de sport is.',
        text_en: 'It is not clear to me anymore; I don\'t really think my place is in sport.',
      },
      {
        n: 14, subscale: 'Geintegreerde regulatie', is_reversed: false,
        text_nl: 'Omdat ik door sport leef volgens wat echt belangrijk voor me is.',
        text_en: 'Because through sport, I am living in line with my deepest principles.',
      },
      {
        n: 15, subscale: 'Externe regulatie', is_reversed: false,
        text_nl: 'Omdat mensen om me heen me belonen als ik sport.',
        text_en: 'Because people around me reward me when I do.',
      },
      {
        n: 16, subscale: 'Geintrojeerde regulatie', is_reversed: false,
        text_nl: 'Omdat ik me beter over mezelf voel als ik sport.',
        text_en: 'Because I feel better about myself when I do.',
      },
      {
        n: 17, subscale: 'Intrinsieke motivatie', is_reversed: false,
        text_nl: 'Omdat het me plezier geeft om meer te leren over mijn sport.',
        text_en: 'Because it gives me pleasure to learn more about my sport.',
      },
      {
        n: 18, subscale: 'Geidentificeerde regulatie', is_reversed: false,
        text_nl: 'Omdat het een van de beste manieren is die ik heb gekozen om andere aspecten van mezelf te ontwikkelen.',
        text_en: 'Because it is one of the best ways I have chosen to develop other aspects of myself.',
      },
    ]

    for (const q of questions) {
      await client.query(`
        INSERT INTO questionnaire_questions (
          questionnaire_id, question_number, question_text,
          question_text_en, subscale_name, is_reversed, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT DO NOTHING
      `, [defId, q.n, q.text_nl, q.text_en, q.subscale, q.is_reversed])
      console.log('[v0] Question', q.n, ':', q.subscale, q.is_reversed ? '(recode)' : '')
    }

    console.log('[v0] Done! SMS-II seeded with', questions.length, 'questions and', subscales.length, 'subscales')
    console.log('[v0] Special chart type: motivation_continuum')
    console.log('[v0] Subscale order (continuum): Amotivatie → Externe regulatie → Geintrojeerde regulatie → Geidentificeerde regulatie → Geintegreerde regulatie → Intrinsieke motivatie')

  } catch (err) {
    console.error('[v0] Error:', err.message)
    console.error(err.detail || '')
  } finally {
    await client.end()
  }
}

run()
