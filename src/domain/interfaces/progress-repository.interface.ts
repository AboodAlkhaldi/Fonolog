import type { Word, StudentWordProgress, WordStatus } from '../types/word.types'
import type { SessionResult, SessionLog } from '../types/session.types'

export interface IProgressRepository {
  getLearnQueue(studentId: string, categoryId?: string): Promise<Word[]>
  getRevisionQueue(studentId: string, categoryId?: string): Promise<Word[]>
  completeWord(studentId: string, wordId: string, correct: boolean): Promise<void>
  saveSession(studentId: string, result: SessionResult): Promise<string>
  getSessionLogs(studentId: string, days?: number): Promise<SessionLog[]>
  getWordProgress(studentId: string): Promise<StudentWordProgress[]>
  getLearnedCount(studentId: string): Promise<number>
}
