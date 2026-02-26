# Database Schema

Supabase (PostgreSQL) — 20 active tables across 6 tiers. All tables have Row Level Security (RLS) enabled.

---

## Tier 1 — User Management

### `profiles`
Extends Supabase Auth `auth.users`. Aangemaakt automatisch via trigger bij elke invite. Wachtwoorden worden opgeslagen door Supabase Auth (`auth.users`) — nooit in `profiles`.

**Invite flow**: Superuser/coach nodigt uit via `/api/admin/invite-user` → Supabase Admin API maakt user aan → Resend stuurt branded mail → gebruiker stelt wachtwoord in op `/auth/set-password`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | matches `auth.users.id` |
| `email` | text | |
| `full_name` | text | |
| `role` | enum | `superuser`, `coach`, `teamlid` |
| `organization_id` | uuid FK → `organizations` | nullable voor superuser |
| `team_id` | uuid FK → `teams` | direct team koppeling (uit invite metadata) |
| `invited_by` | uuid FK → `profiles` | wie heeft deze gebruiker uitgenodigd |
| `invited_at` | timestamptz | tijdstip van uitnodiging |
| `onboarded` | boolean | true na eerste inlog + wachtwoord instellen |
| `created_at` | timestamptz | |

### `organizations`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `superuser_id` | uuid FK → `profiles` | |
| `created_at` | timestamptz | |

### `teams`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | |
| `organization_id` | uuid FK → `organizations` | |
| `coach_id` | uuid FK → `profiles` | |
| `season_start` | date | |
| `season_end` | date | |
| `created_at` | timestamptz | |

### `team_members`
| Column | Type | Notes |
|---|---|---|
| `team_id` | uuid FK → `teams` | |
| `user_id` | uuid FK → `profiles` | role = teamlid |
| `joined_at` | timestamptz | |

---

## Tier 2 — Goal Hierarchy

Three-level goal structure based on evidence-based goal setting (Outcome → Performance → Process).

### `goal_sessions`
A workshop session for a team + period.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `team_id` | uuid FK | |
| `coach_id` | uuid FK | |
| `period` | text | `t0`, `t1`, etc. |
| `status` | text | `draft`, `active`, `completed` |
| `created_at` | timestamptz | |

### `outcome_goals`
Max 5 per subgroup entered, top 3 selected.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `session_id` | uuid FK → `goal_sessions` | |
| `description` | text | |
| `subgroup` | text | e.g. sport-specific, physical, mental |
| `is_selected` | boolean | true = in top 3 |
| `display_order` | integer | |

### `performance_goals`
Max 10 selected total, up to 5 per outcome goal. Each has a measurable component.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `outcome_goal_id` | uuid FK | |
| `description` | text | |
| `measurable_component` | text | what exactly will be measured |
| `is_selected` | boolean | |
| `display_order` | integer | |

### `process_goals`
Tasks, roles, and contextual actions per performance goal.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `performance_goal_id` | uuid FK | |
| `description` | text | |
| `role` | text | who is responsible |
| `context` | text | when / where / how |
| `display_order` | integer | |

---

## Tier 3 — Performance Profiler

Three validated profiling methods, all supporting periods and coach-sharing.

### `performance_profile_characteristics`
Shared quality labels used across all profiler methods for a team.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `team_id` | uuid FK | |
| `name` | text | quality label (e.g. "Uithoudingsvermogen") |
| `display_order` | integer | max 12 per team |
| `created_at` | timestamptz | |

### `performance_profile_data` (Butler & Hardy)
Radar chart: current vs ideal vs importance. Scale 1-10.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `characteristic_id` | uuid FK | |
| `user_id` | uuid FK | |
| `period` | text | |
| `current_score` | integer | 1-10 |
| `ideal_score` | integer | 1-10 |
| `importance_score` | integer | 1-10 |
| `shared_with_coach` | boolean | |

### `performance_profile_jones` (Jones, 1993)
Discrepancy method: current vs ideal + priority ranking.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `characteristic_id` | uuid FK | |
| `user_id` | uuid FK | |
| `period` | text | |
| `current_score` | integer | 1-10 |
| `ideal_score` | integer | 1-10 |
| `priority_rank` | integer | importance ranking |
| `shared_with_coach` | boolean | |

### `performance_profile_gucciardi` (Gucciardi & Gordon, 2009)
Bipolar method: two contrasting anchor labels per quality. Scale -3 to +3.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `characteristic_id` | uuid FK | |
| `user_id` | uuid FK | |
| `period` | text | |
| `score` | integer | -3 to +3 |
| `anchor_negative` | text | negative pole label |
| `anchor_positive` | text | positive pole label |
| `shared_with_coach` | boolean | |

---

## Tier 4 — Flexible Questionnaire System

Fully data-driven: questions, subscales, and scoring rules are stored in the database, not in code.

### `questionnaire_definitions`
One row per questionnaire instrument.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | e.g. "Psychologische Veiligheid" |
| `questionnaire_key` | text UNIQUE | e.g. `psychological_safety`, `pnsss`, `sms_ii` |
| `description` | text | |
| `version` | text | e.g. `1.0`, `2.0` |
| `total_questions` | integer | |
| `likert_min` | integer | e.g. 1 |
| `likert_max` | integer | e.g. 7 |
| `likert_labels` | jsonb | `{"1": "Helemaal niet waar", "7": "Volledig waar"}` |
| `scoring_method` | text | `average`, `sum`, `subscale_average` |
| `has_external_norm` | boolean | true = U3 calculation possible |
| `norm_mean` | numeric | population norm mean |
| `norm_sd` | numeric | population norm SD |
| `norm_source` | text | citation |
| `has_special_chart` | boolean | |
| `chart_type` | text | `motivation_continuum`, `radar_dual` |
| `is_active` | boolean | |
| `created_at` | timestamptz | |

**Seeded questionnaires:**

| Key | Name | Items | Norm |
|---|---|---|---|
| `psychological_safety` | Psychologische Veiligheid (Edmondson, 1999) | 7 | mean=4.6, SD=0.5 |
| `pnsss` | PNSSS Psychologische Behoeften (Ng et al., 2011) | 29 | geen |
| `sms_ii` | SMS-II Sportmotivatieschaal (Pelletier et al., 2013) | 18 | geen |

### `questionnaire_subscales`
Defines groups of questions within a questionnaire.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `questionnaire_id` | uuid FK | |
| `name` | text | e.g. "Autonomiebevrediging" |
| `subscale_key` | text | e.g. `autonomy_sat` |
| `color` | text | hex for chart rendering |
| `display_order` | integer | |
| `scoring_method` | text | `average` |

### `questionnaire_questions`
Individual items. Linked to a questionnaire and optionally to a subscale.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `questionnaire_id` | uuid FK | |
| `subscale_id` | uuid FK nullable | |
| `question_number` | integer | display order and recode lookup |
| `question_text` | text | Dutch |
| `question_text_en` | text | English original |
| `is_reversed` | boolean | reversed display (UI) or math recode |
| `created_at` | timestamptz | |

### `evaluation_campaigns`
A coach sends a questionnaire to a team for a specific period.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `team_id` | uuid FK | |
| `questionnaire_id` | uuid FK | |
| `coach_id` | uuid FK | |
| `period` | text | `t0`, `t1`, etc. |
| `status` | text | `draft`, `sent`, `in_progress`, `closed` |
| `sent_at` | timestamptz | |
| `closed_at` | timestamptz | |
| `created_at` | timestamptz | |

### `evaluation_responses`
One row per athlete per question per campaign.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `campaign_id` | uuid FK | |
| `user_id` | uuid FK | |
| `question_id` | uuid FK | |
| `question_number` | integer | |
| `raw_score` | integer | as clicked by athlete |
| `created_at` | timestamptz | |

### `evaluation_team_summaries`
Calculated aggregate per campaign (after coach closes it).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `campaign_id` | uuid FK | |
| `questionnaire_id` | uuid FK | |
| `team_id` | uuid FK | |
| `period` | text | |
| `response_count` | integer | number of athletes who responded |
| `team_mean` | numeric | overall mean across all items |
| `team_sd` | numeric | |
| `subscale_averages` | jsonb | `{"autonomy_sat": 5.2, "autonomy_fru": 2.1, ...}` |
| `u3_score` | numeric | percentile vs external norm (only if `has_external_norm`) |
| `z_score` | numeric | one-sample z-test vs norm |
| `p_value` | numeric | two-tailed |
| `significance` | text | `*`, `**`, `***`, or null |
| `calculated_at` | timestamptz | |

---

## Tier 5 — Coach Performance Evaluations

### `coach_performance_evaluations`
Coach scores each athlete on each performance goal per period.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `performance_goal_id` | uuid FK | |
| `teamlid_id` | uuid FK | |
| `team_id` | uuid FK | |
| `coach_id` | uuid FK | |
| `period` | text | |
| `evaluation_score` | integer | 1-10 |
| `coach_notes` | text | |
| `data_sources` | jsonb | which profiler methods were used as reference |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

## U3-50% Calculation

Only applies to questionnaires with `has_external_norm = true` (currently: Psychologische Veiligheid).

```
U3 = Φ( (teamMean - normMean) / normSD ) × 100

z  = (teamMean - normMean) / (normSD / √n)
p  = 2 × (1 - Φ(|z|))    [two-tailed]

Significance: * p<.05  ** p<.01  *** p<.001
```

**Edmondson (1999) norm**: mean = 4.6, SD = 0.5

The U3 score is displayed as a horizontal bar chart with 0 as the x-axis. A positive score means the team scores higher than the norm population; negative means lower. The z-test accounts for group size so small teams are not falsely flagged as significant.

---

## RLS Access Matrix

| Table | Superuser | Coach | Teamlid |
|---|---|---|---|
| `profiles` | All | Own team members | Own row |
| `teams` | All | Own teams | Teams they belong to |
| `questionnaire_definitions` | All | Read | Read |
| `questionnaire_questions` | All | Read | Read |
| `evaluation_campaigns` | All | Own team | Own team |
| `evaluation_responses` | All | Team aggregate only | Own rows |
| `evaluation_team_summaries` | All | Own teams | Own teams |
| `performance_profile_*` | All | If shared_with_coach | Own rows |
| `coach_performance_evaluations` | All | Own entries | Own received |
| `goal_sessions` | All | Own team | Read |
| `outcome/performance/process_goals` | All | Own sessions | Read |


---

## API Routes

### `POST /api/admin/invite-user`
Maakt een nieuwe gebruiker aan via de Supabase Admin API (Service Role key vereist). Vereist authenticatie als superuser of coach.

**Body:**
```json
{
  "email": "sporter@example.com",
  "full_name": "Jan de Vries",
  "role": "teamlid",
  "team_id": "uuid-van-team"
}
```

**Wat er gebeurt:**
1. Valideert dat aanroeper superuser is (of coach die alleen teamlid aanmaakt voor eigen team)
2. `supabase.auth.admin.inviteUserByEmail()` — Supabase stuurt invite token
3. Resend stuurt branded welkomstmail met instructies en link naar `/auth/set-password`
4. `profiles` upsert met `invited_by`, `invited_at`, `team_id`

### `POST /api/evaluaties/calculate`
Sluit een campagne en berekent alle scores. Zie README voor de score formules.


### Tier 1: User Management & Organizations (4 tables)
```
profiles (extends auth.users — invite-only, geen zelfregistratie)
├── id (uuid, pk, fk → auth.users)
├── email, full_name, role (superuser|coach|teamlid)
├── organization_id, team_id
├── invited_by, invited_at, onboarded
└── organizations
    ├── id, name, superuser_id
    └── teams
        ├── id, name, coach_id, season_start/end
        └── team_members (team_id, user_id)
```

### Tier 2: Goal Hierarchy (4 tables)
```
goal_sessions (workshop sessions)
├── outcome_goals (max 3 selected, 5 max initial per subgroup)
│   └── performance_goals (max 10 selected, 5 per outcome)
│       └── process_goals (tasks, roles, context)
```

### Tier 3: Performance Profiling - 3 Methods (4 tables)
```
performance_profile_characteristics (max 12 per team)
├── performance_profile_data (Butler & Hardy - Radar, 1-10)
├── performance_profile_jones (Jones - Discrepancy, priority ranking)
└── performance_profile_gucciardi (Gucciardi & Gordon - Bipolaire, -3 to +3)

All support periods: t0, t1, t2, ..., tx
All support "shared_with_coach" flag
```

### Tier 4: Evaluations System (7 tables)
```
questionnaire_definitions (scoring_method, norm_mean, norm_sd, has_external_norm)
├── questionnaire_subscales (subscale_key, color, display_order)
├── questionnaire_questions (question_text NL, question_text_en, is_reversed)
├── evaluation_campaigns (team, period, status: draft→sent→in_progress→closed)
│   └── evaluation_responses (raw_score per question per user)
└── evaluation_team_summaries (team_mean, u3_score, z_score, p_value, significance)
```

### Tier 5: Coach Evaluations (1 table)
```
coach_performance_evaluations
├── performance_goal_id (fk)
├── teamlid_id (fk)
├── evaluation_score (1-10)
├── coach_notes
├── data_sources (JSON: which profiler methods used)
└── period (t0, t1, ..., tx)
```

### Tier 6: Dashboard Caching (2 tables)
```
dashboard_team_metrics
├── period
├── metric_type (evaluation_trends | performance_goals_progress | outcome_goals_status)
└── data (JSONB, pre-calculated)

dashboard_individual_metrics
├── profiler_progress
├── evaluation_trend
├── coach_feedback_avg
└── period
```

## RLS (Row Level Security) Implementation

**Role-Based Access:**
- **Superuser**: All organizations they manage
- **Coach**: Own team(s) data only
- **Teamlid**: Own data + team averages/summaries

**Data Privacy:**
- Teamlid individual scores private (performance profiler)
- Teamlid evaluation responses private (but averages shared with team)
- Only coach can create campaigns and evaluations
- Sharing is explicit (shared_with_coach flag)

## Migration Scripts (in volgorde uitvoeren)

```
08_create_rls_policies.js                        — RLS voor alle tabellen
09_phase4_questionnaire_schema.js                — Flexibel vragenlijst schema
10_seed_questionnaire_1_psychological_safety.js  — Psychologische Veiligheid (7 vragen)
15_seed_questionnaire_2_pnsss_final.js           — PNSSS (29 vragen, 6 subscalen)
16_seed_questionnaire_3_smsii_final.js           — SMS-II (18 vragen, 6 subscalen)
17_add_question_text_en.js                       — question_text_en kolom toevoegen
18_fix_psych_safety.js                           — Likert labels + is_reversed flags
19_add_norm_columns.js                           — norm_mean, norm_sd, has_external_norm; Edmondson (4.6, 0.5)
20_extend_profiles_invite.js                     — invited_by, invited_at, team_id, onboarded aan profiles
```
