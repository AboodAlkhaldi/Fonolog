import type { StudentCharacter, CharacterItem, ItemType, XPSource } from '../types/character.types'

export interface ICharacterRepository {
  getStudentCharacter(studentId: string): Promise<StudentCharacter>
  getAllItems(): Promise<CharacterItem[]>
  awardXP(studentId: string, amount: number, source: XPSource, referenceId?: string): Promise<StudentCharacter>
  equipItem(studentId: string, itemId: string, slot: ItemType): Promise<void>
  unlockItem(studentId: string, itemId: string): Promise<void>
}
