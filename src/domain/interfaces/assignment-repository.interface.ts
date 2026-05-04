import type { Assignment, AssignmentStatus, TestTemplate, StudentMilestone, TeacherNote, Notification } from '../types/assignment.types'

export interface IAssignmentRepository {
  getStudentAssignments(studentId: string): Promise<Assignment[]>
  completeAssignment(assignmentId: string): Promise<void>
  getPendingMilestone(studentId: string): Promise<StudentMilestone | null>
  completeMilestone(milestoneId: string, scorePercent: number): Promise<void>
  getStudentNotifications(studentId: string): Promise<Notification[]>
  markNotificationRead(notificationId: string): Promise<void>
}
