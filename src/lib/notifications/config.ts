/**
 * Hemo Match - Notification Dispatch Configuration
 *
 * SCOPE:
 * Operational anti-fatigue product settings governing outbound donor notifications.
 *
 * CRITICAL CLINICAL & DOMAIN BOUNDARY:
 * These limits are operational anti-spam and notification fatigue parameters designed
 * to prevent broad WhatsApp-style broadcast blasts. They are NOT clinical suitability
 * scores, medical triage rules, or donor qualification thresholds.
 *
 * SECURITY:
 * Dispatch limits are strictly server-controlled. API callers cannot select, override,
 * or expand these limits via public request bodies.
 */

/**
 * Default maximum candidate donors notified per dispatch execution.
 * Clamps outbound alert volume to mitigate donor fatigue while providing
 * rapid response capability for urgent requests.
 */
export const DEFAULT_DISPATCH_LIMIT = 5;

/**
 * Hard internal maximum ceiling for candidate notifications per dispatch event.
 * Used internally for validation guards; cannot be exceeded by configuration.
 */
export const MAX_DISPATCH_LIMIT = 10;
