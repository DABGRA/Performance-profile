# Performance Profile

A full-stack sport psychology platform for coaches and athletes. Built with Next.js 15 (App Router), Supabase (PostgreSQL + Auth + RLS), and Recharts.

---

## What this app does

The platform supports the full evidence-based workflow of a sport psychology coach:

1. **Performance Profiling** — athletes self-assess on key performance qualities using three validated methods
2. **Goal Setting** — coaches run structured workshops to build a three-level goal hierarchy (Outcome → Performance → Process)
3. **Periodic Evaluations** — three validated questionnaires are sent to athletes each period; responses are automatically scored, recoded, and aggregated
4. **Coach Evaluations** — coaches score each athlete on each performance goal (1-10 scale) per period
5. **Analytics & Dashboards** — trends over time, U3-50% scores vs external norms, z-tests for significance, and special motivational profiling

---

## User roles

| Role | Access |
|---|---|
| `superuser` | Manages the platform: creates questionnaires, manages teams, views all campaigns |
| `coach` | Manages their team: runs goal workshops, creates evaluation campaigns, scores athletes |
| `teamlid` | Fills in profilers and questionnaires; sees own trends and team averages |

---

## Application routes

### Auth
- `/auth/login` — Email + password login (Supabase Auth)
- `/auth/set-password` — Sporter/coach stelt wachtwoord in na uitnodiging (invite link landing)
- `/auth/logout` — Session clear

### Superuser (`/dashboard/superuser/`)
- `/` — Overview: user count, team count, campaign count, active questionnaires
- `/gebruikers` — Gebruikersbeheer: alle coaches en teamleden inzien, uitnodigen, opnieuw uitnodigen
- `/teams` — Teams inzien en beheren
- `/vragenlijsten` — List all questionnaires
- `/vragenlijsten/[id]` — Edit questionnaire: questions, subscales, recode flags, Likert labels

### Coach (`/dashboard/coach/`)
- `/` — Home: team summary, recent activity
- `/teamleden` — Teamleden uitnodigen en beheren (alleen eigen team)
- `/doelstellingen` — Goal setting hub (three-phase workshop)
- `/doelstellingen/outcome` — Outcome Goals workshop (max 5 per subgroup, select top 3)
- `/doelstellingen/performance` — Performance Goals workshop (linked to outcome goals, max 10)
- `/doelstellingen/process` — Process Goals workshop (tasks, roles, context per performance goal)
- `/doelstellingen/boom` — Expandable goal tree: full Outcome → Performance → Process hierarchy
- `/evaluaties` — Evaluation campaigns: create, send, close and calculate scores
- `/performance` — Score athletes per performance goal (1-10 + notes) per period
- `/performance/overzicht` — Score matrix: athletes as rows, goals as columns
- `/teams/[id]` — Team analytics: trend charts, U3 vs Edmondson norm, radar charts

### Teamlid (`/dashboard/teamlid/`)
- `/` — Home: todo list (open evaluations, profiler)
- `/profiler` — Choose profiler method
- `/evaluaties` — List of open and completed questionnaires; fill in per question
- `/analytics` — Personal trends: profiler scores over time, questionnaire subscale scores, coach feedback

---

## Performance Profiler — 3 Methods

All methods support periods (`t0`, `t1`, `t2`, …) and a `shared_with_coach` flag.

| Method | Scale | Key output |
|---|---|---|
| Butler & Hardy (1992) | 1-10 | Radar chart: current vs ideal vs importance |
| Jones (1993) | 1-10 + discrepancy | Discrepancy score + priority ranking |
| Gucciardi & Gordon (2009) | -3 to +3 (bipolar) | Bipolar profile chart |

---

## Questionnaires — 3 Validated Instruments

All questionnaires are stored in the database. Structure is fully data-driven (no hard-coded questions in app code). Each question has a Dutch translation and the original English text.

### 1. Psychologische Veiligheid (Edmondson, 1999)
- 7 items, 7-point scale (Zeer onnauwkeurig → Zeer nauwkeurig)
- 3 items displayed in reversed order (UI only, no mathematical recode)
- Total score = mean of 7 items
- **External norm available**: Edmondson (1999) — mean = 4.6, SD = 0.5
- U3-50% score and z-test significance calculated against this norm

### 2. PNSSS — Psychologische Behoeften in Sport (Ng et al., 2011)
- 29 items, 7-point Likert (Helemaal niet waar → Volledig waar)
- 6 subscales: Autonomiebevrediging, Competentiebevrediging, Verbondenheidsbevrediging + 3 frustratie subscales
- No mathematical recode; frustration items form their own subscale
- Visualised as dual radar chart (satisfaction vs frustration)
- No external norm; relative trends only

### 3. SMS-II — Sportmotivatieschaal (Pelletier et al., 2013)
- 18 items, 7-point Likert (Helemaal niet waar → Volledig waar)
- 6 subscales on the Self-Determination Theory continuum:
  - Amotivatie · Externe regulatie · Geintrojeerde regulatie · Geidentificeerde regulatie · Geintegreerde regulatie · Intrinsieke motivatie
- RAI (Relative Autonomy Index) score calculated: `(-3 × amotivatie) + (-2 × extern) + (-1 × introject) + (1 × geidentificeerd) + (2 × geintegreerd) + (3 × intrinsiek)`
- Visualised as motivation continuum bar chart (left = controlled, right = autonomous)
- Special chart type: `motivation_continuum`
- No external norm; relative trends only

---

## Score Calculation

When a coach closes a campaign (`/api/evaluaties/calculate`):

1. All responses for that campaign are fetched
2. Per item: if `is_reversed = true` AND scoring method is agree/disagree → apply `(max + min) - score`
3. Per subscale: mean of items in that subscale
4. Team mean and SD calculated across all respondents
5. **U3-50%** (only for questionnaires with `has_external_norm = true`):
   - `U3 = Φ((teamMean - normMean) / normSD) × 100`
   - z-test: `z = (teamMean - normMean) / (normSD / √n)`
   - Two-tailed p-value: `p = 2 × (1 - Φ(|z|))`
   - Stars: `*` p < .05, `**` p < .01, `***` p < .001
6. Results stored in `evaluation_team_summaries` with `u3_score`, `z_score`, `p_value`, `significance`

---

## User Management & Invite Flow

Users are **never self-registered**. All accounts are created by a superuser or coach via invite.

### How it works

1. Superuser/coach vult naam + email in op `/dashboard/superuser/gebruikers` of `/dashboard/coach/teamleden`
2. API route `/api/admin/invite-user` roept `supabase.auth.admin.inviteUserByEmail()` aan via de **Service Role key**
3. Supabase genereert een tijdgebonden invite token en stuurt de standaard redirect
4. **Resend** stuurt tegelijkertijd een branded welkomstmail met uitleg en de link naar `/auth/set-password`
5. De gebruiker klikt op de link, stelt eigen wachtwoord in, en wordt doorgestuurd naar het juiste dashboard op basis van rol
6. `profiles` wordt automatisch aangemaakt via een Supabase trigger die `full_name`, `role`, `team_id` uit de user metadata pakt

### Wie mag wie uitnodigen

| Uitnodiger | Mag uitnodigen | Rol vastgezet |
|---|---|---|
| Superuser | Coach of teamlid, elk team | Vrij te kiezen |
| Coach | Alleen teamlid | Ja — altijd `teamlid`, altijd eigen team |

### Environment variables vereist

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # invite gebruikers aanmaken via Admin API
RESEND_API_KEY=               # branded welkomstmails versturen
NEXT_PUBLIC_APP_URL=          # basis-URL voor invite links
DATABASE_URL=                 # direct pg connectie voor scripts
```

---

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, RSC + client components) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| ORM | Supabase JS client (`@supabase/ssr`) |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts (via shadcn chart wrapper) |
| Package manager | pnpm |

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, RSC + client components) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth — invite-only flow via Admin API |
| Email | Resend — branded uitnodigingsmails |
| ORM | Supabase JS client (`@supabase/ssr`) |
| Styling | Tailwind CSS + shadcn/ui |
| Charts | Recharts (via shadcn chart wrapper) |
| Package manager | pnpm |

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # used in scripts only
DATABASE_URL=                      # used in scripts only (direct pg connection)
```

---

## Database migrations (run in order)

All scripts are in `/scripts/`. Run with `node scripts/<filename>`.

```
08_create_rls_policies.js                        — RLS policies for all tables
09_phase4_questionnaire_schema.js                — Flexible questionnaire schema
10_seed_questionnaire_1_psychological_safety.js  — Psychologische Veiligheid (7 vragen)
15_seed_questionnaire_2_pnsss_final.js           — PNSSS (29 vragen, 6 subscalen)
16_seed_questionnaire_3_smsii_final.js           — SMS-II (18 vragen, 6 subscalen)
17_add_question_text_en.js                       — Engelse originele teksten toevoegen
18_fix_psych_safety.js                           — Likert labels + reversed display flags fixen
19_add_norm_columns.js                           — norm_mean, norm_sd, has_external_norm; Edmondson norm instellen
20_extend_profiles_invite.js                     — profiles uitbreiden: invited_by, invited_at, team_id, onboarded
```

