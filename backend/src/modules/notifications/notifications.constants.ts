/**
 * Constants & Categories for the Notifications Module (French ONLY)
 */

export const NOTIFICATION_PRIORITIES = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[keyof typeof NOTIFICATION_PRIORITIES];

export const NOTIFICATION_CATEGORIES = {
  DOCUMENT_EXPIRATION: 'DOCUMENT_EXPIRATION',
  PAYMENT_DUE: 'PAYMENT_DUE',
  RECEIVABLE_DUE: 'RECEIVABLE_DUE',
  TRIP_ALERT: 'TRIP_ALERT',
} as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[keyof typeof NOTIFICATION_CATEGORIES];

/**
 * Dynamic Percentage-based Thresholds (V1 Model)
 * - 30% remaining time -> NORMAL
 * - 20% remaining time -> HIGH
 * - 10% remaining time -> URGENT
 * - 0% remaining time -> DUE / EXPIRED (URGENT)
 */
export const NOTIFICATION_THRESHOLDS = {
  EARLY_WARNING_PERCENTAGE: 30, // 30% remaining -> NORMAL
  HIGH_PRIORITY_PERCENTAGE: 20,  // 20% remaining -> HIGH
  URGENT_PERCENTAGE: 10,         // 10% remaining -> URGENT
  EXPIRED_PERCENTAGE: 0,         // 0% remaining -> URGENT
} as const;
