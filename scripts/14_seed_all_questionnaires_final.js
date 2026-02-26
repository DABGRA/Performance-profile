const { Client } = require('pg')

const client = new Client({ connectionString: process.env.DATABASE_URL })

async function main() {
  await client.connect()
  console.log('[v0] Connected to DB')

  // Test: check existing questionnaire_definitions
  const res = await client.query(`SELECT id, name, questionnaire_key FROM questionnaire_definitions ORDER BY created_at`)
  console.log('[v0] Existing definitions:', JSON.stringify(res.rows))

  // Wis alles en begin opnieuw
  await client.query(`DELETE FROM questionnaire_definitions WHERE questionnaire_key IN ('psychological_safety','pnsss','sms_ii')`)
  console.log('[v0] Cleaned existing data')

  // ---- Q1: Psychologische Veiligheid ----
  const q1 = await client.query(
    `INSERT INTO questionnaire_definitions
      (name, description, version, questionnaire_key, total_questions,
       likert_min, likert_max, likert_labels,
       scoring_method, has_special_chart, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [
      'Psychologische Veiligheid',
      'Meet de mate van psychologische veiligheid binnen het team (Edmondson, 1999).',
      '1.0', 'psychological_safety', 7, 1, 7,
      JSON.stringify({1:'Helemaal mee oneens',2:'Mee oneens',3:'Enigszins mee oneens',4:'Neutraal',5:'Enigszins mee eens',6:'Mee eens',7:'Helemaal mee eens'}),
      'average', false, true
    ]
  )
  const q1id = q1.rows[0].id
  console.log('[v0] Q1 definitie aangemaakt:', q1id)

  const sub1 = await client.query(
    `INSERT INTO questionnaire_subscales (questionnaire_id, name, subscale_key, color, display_order, scoring_method)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [q1id, 'Psychologische Veiligheid', 'psych_safety_total', '#3b82f6', 1, 'average']
  )
  const sub1id = sub1.rows[0].id

  const q1items = [
    [1, true,  'Als je in dit team een fout maakt, wordt dat vaak tegen je gebruikt.'],
    [2, false, 'Teamleden kunnen problemen en lastige kwesties bespreekbaar maken.'],
    [3, true,  'Mensen in dit team wijzen anderen soms af omdat ze anders zijn.'],
    [4, false, 'Het is veilig om in dit team een risico te nemen.'],
    [5, true,  'Het is moeilijk om andere teamleden om hulp te vragen.'],
    [6, false, 'Niemand in dit team zou bewust op een manier handelen die mijn inspanningen ondermijnt.'],
    [7, false, 'In de samenwerking met teamleden worden mijn unieke vaardigheden en talenten gewaardeerd en benut.'],
  ]
  for (const [n, rev, txt] of q1items) {
    await client.query(
      `INSERT INTO questionnaire_questions (questionnaire_id, subscale_id, question_number, question_text, is_reversed, is_active) VALUES ($1,$2,$3,$4,$5,true)`,
      [q1id, sub1id, n, txt, rev]
    )
  }
  console.log('[v0] Q1: 7 vragen aangemaakt')

  // ---- Q2: PNSSS ----
  const q2 = await client.query(
    `INSERT INTO questionnaire_definitions
      (name, description, version, questionnaire_key, total_questions,
       likert_min, likert_max, likert_labels,
       scoring_method, has_special_chart, chart_type, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [
      'Psychologische Behoeften in Sport',
      'Meet bevrediging en frustratie van de drie basisbehoeften in de sportcontext. Gebaseerd op PNSSS (Ng et al., 2011).',
      '1.0', 'pnsss', 29, 1, 5,
      JSON.stringify({1:'Helemaal niet waar',2:'Nauwelijks waar',3:'Enigszins waar',4:'Redelijk waar',5:'Volledig waar'}),
      'subscale_average', true, 'radar_dual', true
    ]
  )
  const q2id = q2.rows[0].id
  console.log('[v0] Q2 definitie aangemaakt:', q2id)

  const q2subs = [
    ['Autonomiebevrediging',   'autonomy_sat',      '#3b82f6', 1],
    ['Competentiebevrediging', 'competence_sat',    '#10b981', 2],
    ['Verbondenheidsbevr.',    'relatedness_sat',   '#8b5cf6', 3],
    ['Autonomiefrustratie',    'autonomy_frust',    '#ef4444', 4],
    ['Competentiefrustratie',  'competence_frust',  '#f97316', 5],
    ['Verbondenheidsfrustr.',  'relatedness_frust', '#f59e0b', 6],
  ]
  const q2subIds = {}
  for (const [name, key, color, order] of q2subs) {
    const r = await client.query(
      `INSERT INTO questionnaire_subscales (questionnaire_id, name, subscale_key, color, display_order, scoring_method) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [q2id, name, key, color, order, 'average']
    )
    q2subIds[key] = r.rows[0].id
  }
  console.log('[v0] Q2: 6 subscalen aangemaakt')

  // PNSSS items: [n, subscale_key, text]
  const pnsssItems = [
    [ 1,'autonomy_sat',     'Voel me vrij om keuzes te maken over de manier waarop ik train.'],
    [ 2,'autonomy_frust',   'Voel druk om me op een bepaalde manier te gedragen.'],
    [ 3,'competence_sat',   'Voel me bekwaam.'],
    [ 4,'competence_frust', 'Heb het gevoel dat ik faal.'],
    [ 5,'relatedness_sat',  'Voel me gesteund.'],
    [ 6,'relatedness_frust','Voel me niet geaccepteerd door anderen.'],
    [ 7,'autonomy_sat',     'Heb inbreng in hoe dingen worden gedaan.'],
    [ 8,'autonomy_frust',   'Voel me gedwongen om trainingsbeslissingen te volgen.'],
    [ 9,'competence_sat',   'Voel me vaardig.'],
    [10,'competence_frust', 'Voel me nutteloos.'],
    [11,'relatedness_sat',  'Voel me echt gezien door de mensen om me heen.'],
    [12,'relatedness_frust','Voel me buitengesloten.'],
    [13,'autonomy_sat',     'Heb de vrijheid om trainingsbeslissingen te nemen.'],
    [14,'autonomy_frust',   'Voel me gedwongen trainingstaken uit te voeren die ik zelf niet zou kiezen.'],
    [15,'competence_sat',   'Ben in staat uitdagingen te overwinnen.'],
    [16,'competence_frust', 'Voel me onbekwaam.'],
    [17,'relatedness_sat',  'Voel me verbonden.'],
    [18,'relatedness_frust','Voel me gesoleerd.'],
    [19,'autonomy_sat',     'Werk aan doelen die echt van mij zijn.'],
    [20,'autonomy_frust',   'Ervaar overmatige druk.'],
    [21,'competence_sat',   'Voel me zeker dat ik het goed kan doen.'],
    [22,'competence_frust', 'Voel me hopeloos.'],
    [23,'relatedness_sat',  'Voel me geaccepteerd.'],
    [24,'relatedness_frust','Voel me genegeerd.'],
    [25,'autonomy_sat',     'Voel dat ik mezelf kan zijn.'],
    [26,'autonomy_frust',   'Moet doen wat me verteld wordt.'],
    [27,'competence_sat',   'Voel dat ik het goed doe.'],
    [28,'relatedness_frust','Voel me prettig bij de mensen om me heen.'],
    [29,'relatedness_frust','Voel me niet serieus genomen.'],
  ]
  for (const [n, key, txt] of pnsssItems) {
    await client.query(
      `INSERT INTO questionnaire_questions (questionnaire_id, subscale_id, question_number, question_text, is_reversed, is_active) VALUES ($1,$2,$3,$4,false,true)`,
      [q2id, q2subIds[key], n, txt]
    )
  }
  console.log('[v0] Q2: 29 vragen aangemaakt')

  // ---- Q3: SMS-II ----
  const q3 = await client.query(
    `INSERT INTO questionnaire_definitions
      (name, description, version, questionnaire_key, total_questions,
       likert_min, likert_max, likert_labels,
       scoring_method, has_special_chart, chart_type, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [
      'Sportmotivatieschaal',
      'Meet de kwaliteit van motivatie in de sport op basis van zelfdeterminatietheorie. Gebaseerd op SMS-II (Pelletier et al., 2013).',
      '2.0', 'sms_ii', 18, 1, 7,
      JSON.stringify({1:'Komt helemaal niet overeen',2:'Komt nauwelijks overeen',3:'Komt een beetje overeen',4:'Komt redelijk overeen',5:'Komt behoorlijk overeen',6:'Komt grotendeels overeen',7:'Komt volledig overeen'}),
      'subscale_average', true, 'motivation_continuum', true
    ]
  )
  const q3id = q3.rows[0].id
  console.log('[v0] Q3 definitie aangemaakt:', q3id)

  const q3subs = [
    ['Amotivatie',                 'amotivation',     '#94a3b8', 1],
    ['Externe regulatie',          'external_reg',    '#ef4444', 2],
    ['Geintrojeerde regulatie',    'introjected_reg', '#f97316', 3],
    ['Geidentificeerde regulatie', 'identified_reg',  '#eab308', 4],
    ['Geintegreerde regulatie',    'integrated_reg',  '#22c55e', 5],
    ['Intrinsieke motivatie',      'intrinsic',       '#3b82f6', 6],
  ]
  const q3subIds = {}
  for (const [name, key, color, order] of q3subs) {
    const r = await client.query(
      `INSERT INTO questionnaire_subscales (questionnaire_id, name, subscale_key, color, display_order, scoring_method) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [q3id, name, key, color, order, 'average']
    )
    q3subIds[key] = r.rows[0].id
  }
  console.log('[v0] Q3: 6 subscalen aangemaakt')

  const smsItems = [
    [ 1,'introjected_reg', 'Omdat ik me slecht over mezelf zou voelen als ik er geen tijd aan zou besteden.'],
    [ 2,'amotivation',     'Ik had vroeger goede redenen om te sporten, maar nu vraag ik me af of ik door moet gaan.'],
    [ 3,'intrinsic',       'Omdat het erg interessant is om te leren hoe ik me kan verbeteren.'],
    [ 4,'integrated_reg',  'Omdat sporten de kern weerspiegelt van wie ik ben.'],
    [ 5,'external_reg',    'Omdat mensen die belangrijk voor me zijn het niet fijn zouden vinden als ik het niet deed.'],
    [ 6,'identified_reg',  'Omdat het een goede manier is om aspecten van mezelf te ontwikkelen die ik waardeer.'],
    [ 7,'introjected_reg', 'Omdat ik het gevoel zou krijgen dat ik er niet toe doe als ik het niet deed.'],
    [ 8,'external_reg',    'Omdat ik denk dat anderen me zouden afkeuren als ik het niet deed.'],
    [ 9,'intrinsic',       'Omdat ik het leuk vind om nieuwe prestatiestrategieën te ontdekken.'],
    [10,'amotivation',     'Ik weet het niet meer; ik heb het gevoel dat ik niet in staat ben om te slagen in deze sport.'],
    [11,'integrated_reg',  'Omdat sporten een integraal onderdeel van mijn leven is.'],
    [12,'identified_reg',  'Omdat ik deze sport heb gekozen als een manier om mezelf te ontwikkelen.'],
    [13,'amotivation',     'Het is me niet meer duidelijk; ik denk niet echt dat mijn plek in de sport is.'],
    [14,'integrated_reg',  'Omdat ik door sport leef volgens wat echt belangrijk voor me is.'],
    [15,'external_reg',    'Omdat mensen om me heen me belonen als ik sport.'],
    [16,'introjected_reg', 'Omdat ik me beter over mezelf voel als ik sport.'],
    [17,'intrinsic',       'Omdat het me plezier geeft om meer te leren over mijn sport.'],
    [18,'identified_reg',  'Omdat het een van de beste manieren is die ik heb gekozen om andere aspecten van mezelf te ontwikkelen.'],
  ]
  for (const [n, key, txt] of smsItems) {
    await client.query(
      `INSERT INTO questionnaire_questions (questionnaire_id, subscale_id, question_number, question_text, is_reversed, is_active) VALUES ($1,$2,$3,$4,false,true)`,
      [q3id, q3subIds[key], n, txt]
    )
  }
  console.log('[v0] Q3: 18 vragen aangemaakt')

  console.log('[v0] Klaar! Alle 3 vragenlijsten succesvol geseed.')
  await client.end()
}

main().catch(e => { console.error('[v0] FATAL:', e.message); console.error(e.stack); process.exit(1) })
