export type ItemType = 'hat' | 'shirt' | 'shoes' | 'acc' | 'bg'
export type ItemRarity = 'common' | 'rare' | 'legendary'

export interface CharacterItem {
  id:          string
  item_type:   ItemType
  name:        string
  description: string | null
  image_url:   string | null
  unlock_xp:   number
  rarity:      ItemRarity
  is_premium:  boolean
  sort_order:  number
}

export interface EquippedItems {
  hat?:   CharacterItem
  shirt?: CharacterItem
  shoes?: CharacterItem
  acc?:   CharacterItem
  bg?:    CharacterItem
}

export interface StudentCharacter {
  id:             string
  student_id:     string
  total_xp:       number
  level:          number
  unlocked_items: string[]  // array of item UUIDs
  equipped_hat:   string | null
  equipped_shirt: string | null
  equipped_shoes: string | null
  equipped_acc:   string | null
  equipped_bg:    string | null
  updated_at:     string
}

export type XPSource =
  | 'word_correct'
  | 'word_correct_pronounce'
  | 'session_complete'
  | 'session_perfect'
  | 'assignment_complete'
  | 'assignment_perfect'
  | 'milestone_test'
  | 'milestone_test_perfect'
  | 'daily_login'
  | 'streak_3'
  | 'streak_7'
  | 'streak_30'
