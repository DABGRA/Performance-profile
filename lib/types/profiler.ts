// Shared types for all three Performance Profiler methods

export type ProfilerMethod = 'butler_hardy' | 'jones' | 'gucciardi'

export interface ProfilerCharacteristic {
  id: string
  team_id: string
  characteristic_name: string
  characteristic_order: number
  created_by: string
  created_at: string
}

// Butler & Hardy (1992) - Original radar method
export interface ButlerHardyEntry {
  name: string
  score: number // 1-10
}

export interface ButlerHardyProfile {
  id?: string
  teamlid_id: string
  team_id: string
  period: string
  entries: ButlerHardyEntry[]
  shared_with_coach: boolean
  created_at?: string
}

// Jones (1993) - Advanced discrepancy method
export interface JonesEntry {
  name: string
  characteristic_id: string
  importance_rating: number // 1-10
  ideal_level: number       // 1-10
  current_level: number     // 1-10
  discrepancy_score: number // auto: ideal - current
  priority_rank?: number    // auto sorted
}

export interface JonesProfile {
  id?: string
  teamlid_id: string
  team_id: string
  period: string
  entries: JonesEntry[]
  shared_with_coach: boolean
  created_at?: string
}

// Gucciardi & Gordon (2009) - Revised bipolar method
export interface GucciardiEntry {
  name: string
  characteristic_id: string
  definition_positive: string
  definition_negative: string
  context_situation: string
  score: number // -3 to +3 (7-point bipolar scale stored as 1-7)
}

export interface GucciardiProfile {
  id?: string
  teamlid_id: string
  team_id: string
  period: string
  entries: GucciardiEntry[]
  situations: string
  shared_with_coach: boolean
  created_at?: string
}
