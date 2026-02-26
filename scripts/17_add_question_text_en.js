const { Client } = require('pg')
require('dotenv').config({ path: '.env.local' })

const client = new Client({ connectionString: process.env.DATABASE_URL })

// English texts per questionnaire key + question number
// Q1: Psychological Safety (Edmondson)
const q1_en = {
  1: 'If you make a mistake on this team, it is often held against you.',
  2: 'Members of this team are able to bring up problems and tough issues.',
  3: 'People on this team sometimes reject others for being different.',
  4: 'It is safe to take a risk on this team.',
  5: 'It is difficult to ask other members of this team for help.',
  6: 'No one on this team would deliberately act in a way that undermines my efforts.',
  7: 'Working with members of this team, my unique skills and talents are valued and utilised.',
}

// Q2: PNSSS (Ng et al., 2011)
const q2_en = {
  1:  'Feel free to make choices with regards to the way I train.',
  2:  'Feel pushed to behave in certain ways.',
  3:  'Feel that I am capable.',
  4:  'Feel like a failure.',
  5:  'Feel supported.',
  6:  'Feel disliked.',
  7:  'Have a say in how things are done.',
  8:  'Feel forced to follow training decisions.',
  9:  'Feel skilled.',
  10: 'Feel useless.',
  11: 'Feel cared for.',
  12: 'Feel excluded.',
  13: 'Have the freedom to make training decisions.',
  14: 'Feel forced to do training tasks I would not choose.',
  15: 'Am able to overcome challenges.',
  16: 'Feel incapable.',
  17: 'Feel connected.',
  18: 'Feel isolated.',
  19: 'Pursue goals that are my own.',
  20: 'Feel excessive pressure.',
  21: 'Feel confident that I can do well.',
  22: 'Feel hopeless.',
  23: 'Feel accepted.',
  24: 'Feel ignored.',
  25: 'Feel like I can be myself.',
  26: 'Must do what I am told.',
  27: 'Feel that I am good.',
  28: 'Like the people around me.',
  29: 'Feel dismissed.',
}

// Q3: SMS-II (Pelletier et al., 2013)
const q3_en = {
  1:  'Because I would feel bad about myself if I did not take the time to do it.',
  2:  'I used to have good reasons for doing sports, but now I am asking myself if I should continue.',
  3:  'Because it is very interesting to learn how I can improve.',
  4:  'Because practicing sports reflects the essence of whom I am.',
  5:  'Because people I care about would be upset with me if I did not.',
  6:  'Because I found it is a good way to develop aspects of myself that I value.',
  7:  'Because I would not feel worthwhile if I did not.',
  8:  'Because I think others would disapprove of me if I did not.',
  9:  'Because I find it enjoyable to discover new performance strategies.',
  10: 'I do not know anymore; I have the impression that I am incapable of succeeding in this sport.',
  11: 'Because participating in sport is an integral part of my life.',
  12: 'Because I have chosen this sport as a way to develop myself.',
  13: 'It is not clear to me anymore; I do not really think my place is in sport.',
  14: 'Because through sport, I am living in line with my deepest principles.',
  15: 'Because people around me reward me when I do.',
  16: 'Because I feel better about myself when I do.',
  17: 'Because it gives me pleasure to learn more about my sport.',
  18: 'Because it is one of the best ways I have chosen to develop other aspects of myself.',
}

async function run() {
  await client.connect()
  console.log('[v0] Connected to DB')

  try {
    // Step 1: Add question_text_en column if it does not exist
    await client.query(`
      ALTER TABLE questionnaire_questions
      ADD COLUMN IF NOT EXISTS question_text_en TEXT;
    `)
    console.log('[v0] Column question_text_en ensured')

    // Step 2: Get all questionnaire IDs by key
    const defRes = await client.query(`
      SELECT id, questionnaire_key FROM questionnaire_definitions
      WHERE questionnaire_key IN ('psychological_safety', 'pnsss', 'sms_ii')
    `)
    const defs = {}
    for (const row of defRes.rows) {
      defs[row.questionnaire_key] = row.id
    }
    console.log('[v0] Found questionnaire definitions:', Object.keys(defs))

    // Step 3: Update EN texts per questionnaire
    const updates = [
      { key: 'psychological_safety', map: q1_en },
      { key: 'pnsss',                map: q2_en },
      { key: 'sms_ii',               map: q3_en },
    ]

    for (const { key, map } of updates) {
      const qid = defs[key]
      if (!qid) { console.log(`[v0] SKIP ${key} - not found`); continue }

      let count = 0
      for (const [num, text] of Object.entries(map)) {
        await client.query(
          `UPDATE questionnaire_questions
           SET question_text_en = $1
           WHERE questionnaire_id = $2 AND question_number = $3`,
          [text, qid, parseInt(num)]
        )
        count++
      }
      console.log(`[v0] Updated ${count} EN texts for ${key}`)
    }

    // Step 4: Verify
    const check = await client.query(`
      SELECT qd.questionnaire_key, qq.question_number, qq.question_text, qq.question_text_en
      FROM questionnaire_questions qq
      JOIN questionnaire_definitions qd ON qd.id = qq.questionnaire_id
      ORDER BY qd.questionnaire_key, qq.question_number
      LIMIT 10
    `)
    console.log('[v0] Sample (first 10):')
    for (const r of check.rows) {
      console.log(`  [${r.questionnaire_key}] Q${r.question_number}: "${r.question_text}" | EN: "${r.question_text_en}"`)
    }

    console.log('[v0] Done - all English texts stored')
  } catch (err) {
    console.error('[v0] Error:', err.message)
  } finally {
    await client.end()
  }
}

run()
