import type { Assignment, TestTemplate, TeacherNote } from '../types/assignment.types'
import type { SessionLog } from '../types/session.types'
import type { Profile, TeacherStudent } from '../types/user.types'
import type { Word, Category, StudentWordProgress } from '../types/word.types'

export interface ITeacherRepository {
  getLinkedStudents(teacherId: string): Promise<(TeacherStudent & { profile?: Profile })[]>
  linkStudent(teacherId: string, studentId: string): Promise<void>
  addManualStudent(teacherId: string, name: string, email: string): Promise<void>
  getStudentSessions(studentId: string, days?: number): Promise<SessionLog[]>
  getStudentWordProgress(studentId: string): Promise<StudentWordProgress[]>
  createAssignment(assignment: Omit<Assignment, 'id' | 'created_at' | 'status' | 'completed_at'>): Promise<Assignment>
  getTeacherAssignments(teacherId: string): Promise<Assignment[]>
  createTestTemplate(template: Omit<TestTemplate, 'id' | 'created_at'>): Promise<TestTemplate>
  getTestTemplates(teacherId: string): Promise<TestTemplate[]>
  addTeacherNote(note: Omit<TeacherNote, 'id' | 'created_at' | 'updated_at'>): Promise<TeacherNote>
  getTeacherNotes(teacherId: string, studentId: string): Promise<TeacherNote[]>
  getAllCategories(): Promise<Category[]>
  getAllWords(): Promise<Word[]>
  addWord(word: { word_text: string; category_id: string; syllables: string[]; syllable_count: number; first_sound: string; last_sound: string; rhyme_group?: string }): Promise<Word>
  generateTTS(wordId: string): Promise<string>
  overrideMilestoneLock(milestoneId: string): Promise<void>
  searchAllUsers(query: string): Promise<Profile[]>
}
