import type { SubscriptionStatus, EntitlementKey } from '../types/user.types'

export interface ISubscriptionService {
  initialize(userId: string): Promise<void>
  getStatus(): Promise<SubscriptionStatus>
  hasEntitlement(key: EntitlementKey): boolean
  presentPaywall(): Promise<void>
}
