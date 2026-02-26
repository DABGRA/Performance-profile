export type QuestionnaireDefinition = {
  id: string
  organization_id: string | null
  name: string
  description: string | null
  version: string
  questionnaire_key: string
  total_questions: number
  likert_min: number
  likert_max: number
  scoring_method: 'average' | 'sum' | 'weighted'
  has_special_chart: boolean
  chart_type: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
}

export type QuestionnaireSubscale = {
  id: string
  questionnaire_id: string
  name: string
  description: string | null
  subscale_key: string
  color: string | null
  display_order: number
  scoring_method: 'average' | 'sum' | 'weighted'
}

export type QuestionnaireQuestion = {
  id: string
  questionnaire_id: string
  subscale_id: string | null
  question_number: number
  question_text: string
  is_reversed: boolean
  is_active: boolean
  help_text: string | null
}

export type EvaluationCampaign = {
  id: string
  team_id: string
  questionnaire_id: string
  period: string
  label: string | null
  status: 'draft' | 'sent' | 'in_progress' | 'closed'
  created_by: string | null
  created_at: string
  deadline: string | null
  sent_at: string | null
  closed_at: string | null
  questionnaire?: QuestionnaireDefinition
}

export type EvaluationResponse = {
  id: string
  campaign_id: string
  teamlid_id: string
  responses: Record<string, number>
  raw_total_score: number | null
  calculated_avg: number | null
  subscale_scores: Record<string, number> | null
  submitted_at: string
}

export type EvaluationTeamSummary = {
  id: string
  campaign_id: string
  team_id: string
  period: string
  response_count: number
  team_avg: number | null
  subscale_averages: Record<string, number> | null
  u3_score: number | null
  calculated_at: string
}
