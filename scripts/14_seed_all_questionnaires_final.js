/**
 * Script 14: Seed alle 3 vragenlijsten met correcte schema
 * Gebruikt exacte kolomnamen uit de database:
 * - questionnaire_subscales: id, questionnaire_id, name, description, subscale_key, color, display_order, scoring_method
 * - questionnaire_questions: id, questionnaire_id, subscale_id, question_number, question_text, is_reversed, is_active, help_text
 * 
 * Eerst alle bestaande data wissen, dan opnieuw seeden.
 */

import pg from 'pg'
const { Client } = pg

const client = new Client({ connectionString: process.env.DATABASE_URL })

async function seedQuestionnaire(client, def, subscales, questions) {
  // 1. Wis bestaande definitie (cascade naar subscales + questions)
  await client.query(
    `DELETE FROM questionnaire_definitions WHERE questionnaire_key = $1`,
    [def.questionnaire_key]
  )
  console.log(`[v0] Wiped existing definition for ${def.questionnaire_key}`)

  // 2. Maak definitie aan
  const defRes = await client.query(
    `INSERT INTO questionnaire_definitions
      (name, description, version, questionnaire_key, total_questions,
       likert_min, likert_max, likert_labels, scoring_method,
       has_special_chart, chart_type, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id`,
    [
      def.name, def.description, def.version, def.questionnaire_key,
      def.total_questions, def.likert_min, def.likert_max,
      JSON.stringify(def.likert_labels), def.scoring_method,
      def.has_special_chart, def.chart_type ?? null, def.is_active,
    ]
  )
  const defId = defRes.rows[0].id
  console.log(`[v0] Created definition: ${def.name} (${defId})`)

  // 3. Maak subscales aan en bewaar id's op key
  const subscaleIds = {}
  for (const sub of subscales) {
    const subRes = await client.query(
      `INSERT INTO questionnaire_subscales
        (questionnaire_id, name, description, subscale_key, color, display_order, scoring_method)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [defId, sub.name, sub.description, sub.key, sub.color, sub.display_order, sub.scoring_method ?? 'average']
    )
    subscaleIds[sub.key] = subRes.rows[0].id
    console.log(`[v0]   Subscale: ${sub.name} (${sub.key})`)
  }

  // 4. Maak vragen aan
  for (const q of questions) {
    const subscaleId = q.subscale_key ? subscaleIds[q.subscale_key] : null
    await client.query(
      `INSERT INTO questionnaire_questions
        (questionnaire_id, subscale_id, question_number, question_text, is_reversed, help_text, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,true)`,
      [defId, subscaleId, q.n, q.text_nl, q.is_reversed ?? false, q.text_en ?? null]
    )
  }
  console.log(`[v0]   ${questions.length} vragen aangemaakt`)
}

// ============================================================
// VRAGENLIJST 1: Psychologische Veiligheid (Edmondson 1999)
// ============================================================
const q1_def = {
  name: 'Psychologische Veiligheid',
  description: 'Meet de mate van psychologische veiligheid binnen het team. Gebaseerd op het model van Edmondson (1999).',
  version: '1.0',
  questionnaire_key: 'psychological_safety',
  total_questions: 7,
  likert_min: 1,
  likert_max: 7,
  likert_labels: { 1: 'Helemaal mee oneens', 2: 'Mee oneens', 3: 'Enigszins mee oneens', 4: 'Neutraal', 5: 'Enigszins mee eens', 6: 'Mee eens', 7: 'Helemaal mee eens' },
  scoring_method: 'average',
  has_special_chart: false,
  is_active: true,
}
// Psychologische Veiligheid heeft 1 schaal (totaalscore), geen subscales nodig
const q1_subscales = [
  { name: 'Psychologische Veiligheid', description: 'Totaalscore psychologische veiligheid', key: 'psych_safety_total', color: '#3b82f6', display_order: 1, scoring_method: 'average' },
]
const q1_questions = [
  { n: 1, subscale_key: 'psych_safety_total', is_reversed: true,  text_nl: 'Als je in dit team een fout maakt, wordt dat vaak tegen je gebruikt.', text_en: 'If you make a mistake on this team, it is often held against you.' },
  { n: 2, subscale_key: 'psych_safety_total', is_reversed: false, text_nl: 'Teamleden kunnen problemen en lastige kwesties bespreekbaar maken.', text_en: 'Members of this team are able to bring up problems and tough issues.' },
  { n: 3, subscale_key: 'psych_safety_total', is_reversed: true,  text_nl: 'Mensen in dit team wijzen anderen soms af omdat ze anders zijn.', text_en: 'People on this team sometimes reject others for being different.' },
  { n: 4, subscale_key: 'psych_safety_total', is_reversed: false, text_nl: 'Het is veilig om in dit team een risico te nemen.', text_en: 'It is safe to take a risk on this team.' },
  { n: 5, subscale_key: 'psych_safety_total', is_reversed: true,  text_nl: 'Het is moeilijk om andere teamleden om hulp te vragen.', text_en: 'It is difficult to ask other members of this team for help.' },
  { n: 6, subscale_key: 'psych_safety_total', is_reversed: false, text_nl: 'Niemand in dit team zou bewust op een manier handelen die mijn inspanningen ondermijnt.', text_en: 'No one on this team would deliberately act in a way that undermines my efforts.' },
  { n: 7, subscale_key: 'psych_safety_total', is_reversed: false, text_nl: 'In de samenwerking met teamleden worden mijn unieke vaardigheden en talenten gewaardeerd en benut.', text_en: 'Working with members of this team, my unique skills and talents are valued and utilized.' },
]

// ============================================================
// VRAGENLIJST 2: PNSSS - Psychologische Behoeften in Sport
// ============================================================
const q2_def = {
  name: 'Psychologische Behoeften in Sport',
  description: 'Meet bevrediging en frustratie van de drie basisbehoeften (autonomie, competentie, verbondenheid) in de sportcontext. Gebaseerd op de PNSSS (Ng et al., 2011).',
  version: '1.0',
  questionnaire_key: 'pnsss',
  total_questions: 29,
  likert_min: 1,
  likert_max: 5,
  likert_labels: { 1: 'Helemaal niet waar', 2: 'Nauwelijks waar', 3: 'Enigszins waar', 4: 'Redelijk waar', 5: 'Volledig waar' },
  scoring_method: 'subscale_average',
  has_special_chart: true,
  chart_type: 'radar_dual',
  is_active: true,
}
const q2_subscales = [
  { name: 'Autonomiebevrediging',    description: 'Gevoel van keuzevrijheid en eigen regie in de sport',                       key: 'autonomy_sat',        color: '#3b82f6', display_order: 1 },
  { name: 'Competentiebevrediging',  description: 'Gevoel van bekwaamheid en effectiviteit in de sport',                       key: 'competence_sat',      color: '#10b981', display_order: 2 },
  { name: 'Verbondenheidsbevr.',     description: 'Gevoel van verbinding, zorg en acceptatie binnen het team',                  key: 'relatedness_sat',     color: '#8b5cf6', display_order: 3 },
  { name: 'Autonomiefrustratie',     description: 'Gevoel van dwang, druk of gebrek aan keuzevrijheid in de sport',            key: 'autonomy_frust',      color: '#ef4444', display_order: 4 },
  { name: 'Competentiefrustratie',   description: 'Gevoel van onbekwaamheid of falen in de sport',                             key: 'competence_frust',    color: '#f97316', display_order: 5 },
  { name: 'Verbondenheidsfrustr.',   description: 'Gevoel van uitsluiting, afwijzing of niet geaccepteerd worden in het team', key: 'relatedness_frust',   color: '#f59e0b', display_order: 6 },
]
// Vragen per subscaal (uit PNSSS scoring key)
// Autonomiebevrediging: 1,7,13,19,25 | Competentiebevrediging: 3,9,15,21,27 | Verbondenheidsbevr: 5,11,17,23,29
// Autonomiefrustratie: 2,8,14,20,26  | Competentiefrustratie: 4,10,16,22,28 | Verbondenheidsfrust: 6,12,18,24,29
// NB: item 29 hoort bij verbondenheid-bevrediging + verbondenheid-frustratie (zie scoring key)
const pnsss_items = [
  { n:  1, key: 'autonomy_sat',      text_nl: 'Voel me vrij om keuzes te maken over de manier waarop ik train.',                                                   text_en: 'Feel free to make choices with regards to the way I train.' },
  { n:  2, key: 'autonomy_frust',    text_nl: 'Voel druk om me op een bepaalde manier te gedragen.',                                                               text_en: 'Feel pushed to behave in certain ways.' },
  { n:  3, key: 'competence_sat',    text_nl: 'Voel me bekwaam.',                                                                                                  text_en: 'Feel that I am capable.' },
  { n:  4, key: 'competence_frust',  text_nl: 'Heb het gevoel dat ik faal.',                                                                                       text_en: 'Feel like a failure.' },
  { n:  5, key: 'relatedness_sat',   text_nl: 'Voel me gesteund.',                                                                                                 text_en: 'Feel supported.' },
  { n:  6, key: 'relatedness_frust', text_nl: 'Voel me niet geaccepteerd door anderen.',                                                                           text_en: 'Feel disliked.' },
  { n:  7, key: 'autonomy_sat',      text_nl: 'Heb inbreng in hoe dingen worden gedaan.',                                                                          text_en: 'Have a say in how things are done.' },
  { n:  8, key: 'autonomy_frust',    text_nl: 'Voel me gedwongen om trainingsbeslissingen te volgen.',                                                             text_en: 'Feel forced to follow training decisions.' },
  { n:  9, key: 'competence_sat',    text_nl: 'Voel me vaardig.',                                                                                                  text_en: 'Feel skilled.' },
  { n: 10, key: 'competence_frust',  text_nl: 'Voel me nutteloos.',                                                                                                text_en: 'Feel useless.' },
  { n: 11, key: 'relatedness_sat',   text_nl: 'Voel me echt gezien door de mensen om me heen.',                                                                    text_en: 'Feel cared for.' },
  { n: 12, key: 'relatedness_frust', text_nl: 'Voel me buitengesloten.',                                                                                           text_en: 'Feel excluded.' },
  { n: 13, key: 'autonomy_sat',      text_nl: 'Heb de vrijheid om trainingsbeslissingen te nemen.',                                                                text_en: 'Have the freedom to make training decisions.' },
  { n: 14, key: 'autonomy_frust',    text_nl: 'Voel me gedwongen trainingstaken uit te voeren die ik zelf niet zou kiezen.',                                       text_en: 'Feel forced to do training tasks I would not choose.' },
  { n: 15, key: 'competence_sat',    text_nl: 'Ben in staat uitdagingen te overwinnen.',                                                                           text_en: 'Am able to overcome challenges.' },
  { n: 16, key: 'competence_frust',  text_nl: 'Voel me onbekwaam.',                                                                                               text_en: 'Feel incapable.' },
  { n: 17, key: 'relatedness_sat',   text_nl: 'Voel me verbonden.',                                                                                               text_en: 'Feel connected.' },
  { n: 18, key: 'relatedness_frust', text_nl: 'Voel me geïsoleerd.',                                                                                              text_en: 'Feel isolated.' },
  { n: 19, key: 'autonomy_sat',      text_nl: 'Werk aan doelen die echt van mij zijn.',                                                                            text_en: 'Pursue goals that are my own.' },
  { n: 20, key: 'autonomy_frust',    text_nl: 'Ervaar overmatige druk.',                                                                                           text_en: 'Feel excessive pressure.' },
  { n: 21, key: 'competence_sat',    text_nl: 'Voel me zeker dat ik het goed kan doen.',                                                                           text_en: 'Feel confident that I can do well.' },
  { n: 22, key: 'competence_frust',  text_nl: 'Voel me hopeloos.',                                                                                                text_en: 'Feel hopeless.' },
  { n: 23, key: 'relatedness_sat',   text_nl: 'Voel me geaccepteerd.',                                                                                            text_en: 'Feel accepted.' },
  { n: 24, key: 'relatedness_frust', text_nl: 'Voel me genegeerd.',                                                                                               text_en: 'Feel ignored.' },
  { n: 25, key: 'autonomy_sat',      text_nl: 'Voel dat ik mezelf kan zijn.',                                                                                      text_en: 'Feel like I can be myself.' },
  { n: 26, key: 'autonomy_frust',    text_nl: 'Moet doen wat me verteld wordt.',                                                                                   text_en: 'Must do what I am told.' },
  { n: 27, key: 'competence_sat',    text_nl: 'Voel dat ik het goed doe.',                                                                                         text_en: 'Feel that I am good.' },
  { n: 28, key: 'competence_frust',  text_nl: 'Voel me niet prettig bij de mensen om me heen.',                                                                   text_en: 'Like the people around me.' },
  { n: 29, key: 'relatedness_sat',   text_nl: 'Voel me niet serieus genomen.',                                                                                    text_en: 'Feel dismissed.' },
]
// Fix item 28 en 29 - item 28 is relatedness_frust in de scoring key, 29 is ook relatedness_frust
// Correcte subscaal toewijzing op basis van PNSSS scoring key:
pnsss_items[27].key = 'relatedness_frust' // item 28
pnsss_items[28].key = 'relatedness_frust' // item 29
const q2_questions = pnsss_items.map(q => ({ ...q, subscale_key: q.key }))

// ============================================================
// VRAGENLIJST 3: SMS-II - Sportmotivatieschaal
// ============================================================
const q3_def = {
  name: 'Sportmotivatieschaal',
  description: 'Meet de kwaliteit van motivatie in de sport op basis van de zelfdeterminatietheorie. Zes subscalen van amotivatie tot intrinsieke motivatie. Gebaseerd op de SMS-II (Pelletier et al., 2013).',
  version: '2.0',
  questionnaire_key: 'sms_ii',
  total_questions: 18,
  likert_min: 1,
  likert_max: 7,
  likert_labels: { 1: 'Komt helemaal niet overeen', 2: 'Komt nauwelijks overeen', 3: 'Komt een beetje overeen', 4: 'Komt redelijk overeen', 5: 'Komt behoorlijk overeen', 6: 'Komt grotendeels overeen', 7: 'Komt volledig overeen' },
  scoring_method: 'subscale_average',
  has_special_chart: true,
  chart_type: 'motivation_continuum',
  is_active: true,
}
const q3_subscales = [
  { name: 'Amotivatie',                 description: 'Geen reden meer om te sporten, gevoel van onbekwaamheid of zinloosheid',                         key: 'amotivation',         color: '#94a3b8', display_order: 1 },
  { name: 'Externe regulatie',          description: 'Sport omwille van externe beloningen of om straf of afkeuring te vermijden',                     key: 'external_reg',        color: '#ef4444', display_order: 2 },
  { name: 'Geintrojeerde regulatie',    description: 'Sport om zelfkritiek of schuldgevoel te vermijden, innerlijke druk',                             key: 'introjected_reg',     color: '#f97316', display_order: 3 },
  { name: 'Geidentificeerde regulatie', description: 'Sport omdat men de waarde ervan inziet voor persoonlijke ontwikkeling',                          key: 'identified_reg',      color: '#eab308', display_order: 4 },
  { name: 'Geintegreerde regulatie',    description: 'Sport is een integraal onderdeel van de persoonlijke identiteit en waarden',                     key: 'integrated_reg',      color: '#22c55e', display_order: 5 },
  { name: 'Intrinsieke motivatie',      description: 'Sport om de inherente vreugde en interesse in leren en verbeteren',                              key: 'intrinsic',           color: '#3b82f6', display_order: 6 },
]
const q3_questions = [
  { n:  1, subscale_key: 'introjected_reg',  is_reversed: false, text_nl: 'Omdat ik me slecht over mezelf zou voelen als ik er geen tijd aan zou besteden.',                       text_en: 'Because I would feel bad about myself if I did not take the time to do it.' },
  { n:  2, subscale_key: 'amotivation',      is_reversed: false, text_nl: 'Ik had vroeger goede redenen om te sporten, maar nu vraag ik me af of ik door moet gaan.',             text_en: 'I used to have good reasons for doing sports, but now I am asking myself if I should continue.' },
  { n:  3, subscale_key: 'intrinsic',        is_reversed: false, text_nl: 'Omdat het erg interessant is om te leren hoe ik me kan verbeteren.',                                   text_en: 'Because it is very interesting to learn how I can improve.' },
  { n:  4, subscale_key: 'integrated_reg',   is_reversed: false, text_nl: 'Omdat sporten de kern weerspiegelt van wie ik ben.',                                                   text_en: 'Because practicing sports reflects the essence of whom I am.' },
  { n:  5, subscale_key: 'external_reg',     is_reversed: false, text_nl: 'Omdat mensen die belangrijk voor me zijn het niet fijn zouden vinden als ik het niet deed.',           text_en: 'Because people I care about would be upset with me if I didn\'t.' },
  { n:  6, subscale_key: 'identified_reg',   is_reversed: false, text_nl: 'Omdat het een goede manier is om aspecten van mezelf te ontwikkelen die ik waardeer.',                text_en: 'Because I found it is a good way to develop aspects of myself that I value.' },
  { n:  7, subscale_key: 'introjected_reg',  is_reversed: false, text_nl: 'Omdat ik het gevoel zou krijgen dat ik er niet toe doe als ik het niet deed.',                         text_en: 'Because I would not feel worthwhile if I did not.' },
  { n:  8, subscale_key: 'external_reg',     is_reversed: false, text_nl: 'Omdat ik denk dat anderen me zouden afkeuren als ik het niet deed.',                                   text_en: 'Because I think others would disapprove of me if I did not.' },
  { n:  9, subscale_key: 'intrinsic',        is_reversed: false, text_nl: 'Omdat ik het leuk vind om nieuwe prestatiestrategieën te ontdekken.',                                 text_en: 'Because I find it enjoyable to discover new performance strategies.' },
  { n: 10, subscale_key: 'amotivation',      is_reversed: false, text_nl: 'Ik weet het niet meer; ik heb het gevoel dat ik niet in staat ben om te slagen in deze sport.',       text_en: 'I don\'t know anymore; I have the impression that I am incapable of succeeding in this sport.' },
  { n: 11, subscale_key: 'integrated_reg',   is_reversed: false, text_nl: 'Omdat sporten een integraal onderdeel van mijn leven is.',                                            text_en: 'Because participating in sport is an integral part of my life.' },
  { n: 12, subscale_key: 'identified_reg',   is_reversed: false, text_nl: 'Omdat ik deze sport heb gekozen als een manier om mezelf te ontwikkelen.',                            text_en: 'Because I have chosen this sport as a way to develop myself.' },
  { n: 13, subscale_key: 'amotivation',      is_reversed: false, text_nl: 'Het is me niet meer duidelijk; ik denk niet echt dat mijn plek in de sport is.',                       text_en: 'It is not clear to me anymore; I don\'t really think my place is in sport.' },
  { n: 14, subscale_key: 'integrated_reg',   is_reversed: false, text_nl: 'Omdat ik door sport leef volgens wat echt belangrijk voor me is.',                                    text_en: 'Because through sport, I am living in line with my deepest principles.' },
  { n: 15, subscale_key: 'external_reg',     is_reversed: false, text_nl: 'Omdat mensen om me heen me belonen als ik sport.',                                                    text_en: 'Because people around me reward me when I do.' },
  { n: 16, subscale_key: 'introjected_reg',  is_reversed: false, text_nl: 'Omdat ik me beter over mezelf voel als ik sport.',                                                    text_en: 'Because I feel better about myself when I do.' },
  { n: 17, subscale_key: 'intrinsic',        is_reversed: false, text_nl: 'Omdat het me plezier geeft om meer te leren over mijn sport.',                                        text_en: 'Because it gives me pleasure to learn more about my sport.' },
  { n: 18, subscale_key: 'identified_reg',   is_reversed: false, text_nl: 'Omdat het een van de beste manieren is die ik heb gekozen om andere aspecten van mezelf te ontwikkelen.', text_en: 'Because it is one of the best ways I have chosen to develop other aspects of myself.' },
]

async function main() {
  await client.connect()
  console.log('[v0] Seeding alle 3 vragenlijsten...\n')
  try {
    await seedQuestionnaire(client, q1_def, q1_subscales, q1_questions)
    console.log('[v0] Q1 Psychologische Veiligheid: OK\n')

    await seedQuestionnaire(client, q2_def, q2_subscales, q2_questions)
    console.log('[v0] Q2 PNSSS Psychologische Behoeften: OK\n')

    await seedQuestionnaire(client, q3_def, q3_subscales, q3_questions)
    console.log('[v0] Q3 SMS-II Sportmotivatieschaal: OK\n')

    console.log('[v0] Alle 3 vragenlijsten succesvol geseed!')
  } catch (err) {
    console.error('[v0] Error:', err.message)
    console.error(err.stack)
  } finally {
    await client.end()
  }
}

main()
