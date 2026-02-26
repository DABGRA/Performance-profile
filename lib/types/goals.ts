// Goal Setting Types
export type GoalStatus = 'draft' | 'presented' | 'selected' | 'approved'
export type SessionType = 'outcome_goals' | 'performance_goals' | 'process_goals'
export type SessionStatus = 'draft' | 'active' | 'concluded' | 'approved'

export interface GoalSession {
  id: string
  team_id: string
  session_type: SessionType
  session_number: number
  session_date: string
  status: SessionStatus
  created_by: string
  created_at: string
}

export interface OutcomeGoal {
  id: string
  team_id: string
  goal_session_id: string
  title: string
  description: string
  timeline: string
  subgroup_created_by: string
  status: GoalStatus
  presentation_order: number
  created_at: string
  approved_at?: string
  approved_by?: string
}

export interface PerformanceGoal {
  id: string
  outcome_goal_id: string
  team_id: string
  title: string
  description: string
  measurable_component: string
  subgroup_created_by: string
  status: GoalStatus
  presentation_order: number
  created_at: string
  approved_at?: string
  approved_by?: string
}

export interface ProcessGoal {
  id: string
  performance_goal_id: string
  title: string
  description: string
  task: string
  assigned_role: string
  context_situation: string
  created_by: string
  created_at: string
}
