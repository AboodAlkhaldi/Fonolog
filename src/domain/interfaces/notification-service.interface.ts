export interface INotificationService {
  registerToken(token: string): Promise<void>
  getToken(): Promise<string | null>
  requestPermission(): Promise<boolean>
}
