/**
 * Hemo Match - Notifications Subsystem
 *
 * Scope: Manages in-app urgent alerts and dispatching matching notifications
 * to candidate donors and requesters.
 *
 * Note: Initial implementation uses in-app alerts (no SMS/push services).
 * Business logic is deferred to subsequent implementation milestones.
 */

export type NotificationType =
  | 'match_alert'
  | 'contact_reveal_request'
  | 'contact_reveal_approved'
  | 'request_status_update'
  | 'system';

export interface AppNotification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  type: NotificationType;
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface DispatchNotificationPayload {
  recipientId: string;
  title: string;
  message: string;
  type: NotificationType;
  referenceId?: string;
}

/**
 * Placeholder for dispatching in-app notifications.
 * Business logic will be implemented in the notifications milestone.
 */
export async function sendInAppNotification(
  _payload: DispatchNotificationPayload
): Promise<{ success: boolean; notificationId: string }> {
  // Stubbed for initial foundation
  return {
    success: true,
    notificationId: 'stub-notification-id',
  };
}
