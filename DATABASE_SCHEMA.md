# Phase 1: Database Setup - Complete

## Database Schema - 22 Tables (Fully Relational & RLS Protected)

### Tier 1: User Management & Organizations (4 tables)
```
users
├── id (uuid, pk)
├── email (unique)
├── role (superuser | coach | teamlid)
└── organizations
    ├── id (uuid, pk)
    ├── superuser_id (fk → users)
    └── teams
        ├── id (uuid, pk)
        ├── coach_id (fk → users)
        ├── season_start/end
        └── team_members
            ├── team_id (fk → teams)
            └── user_id (fk → users, role=teamlid)
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
questionnaire_questions (static, public)
├── evaluation_campaigns
│   ├── evaluation_responses_q1 (7 questions, 1-5 Likert)
│   ├── evaluation_responses_q2 (20 questions, 1-5 Likert)
│   └── evaluation_responses_q3 (20 questions, 1-5 Likert)
│
├── evaluation_summary_per_teamlid (avg across 3 questionnaires per period)
└── evaluation_summary_per_team (team averages + U3-50% scores per period)
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

## Migration Files

```
scripts/
├── 01_create_users_and_orgs.sql
├── 02_create_teams_and_members.sql
├── 03_create_goal_hierarchy.sql
├── 04_create_performance_profiles.sql
├── 05_create_evaluations.sql
├── 06_create_coach_evaluations.sql
└── 07_create_dashboard_metrics.sql
```

## Next Steps

**Phase 2**: Need to execute migrations on Supabase
- Connect your Supabase project
- Run all 7 migration files
- Set up environment variables

Ready?
