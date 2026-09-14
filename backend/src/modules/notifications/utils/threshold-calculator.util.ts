import {
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_THRESHOLDS,
  NotificationPriority,
} from '../notifications.constants';

export interface CalculatedThreshold {
  percentage: number;
  offsetDays: number;
  priority: NotificationPriority;
  notificationDate: Date;
  thresholdKey: string;
}

function getPriorityWeight(priority: NotificationPriority): number {
  switch (priority) {
    case NOTIFICATION_PRIORITIES.URGENT:
      return 3;
    case NOTIFICATION_PRIORITIES.HIGH:
      return 2;
    case NOTIFICATION_PRIORITIES.NORMAL:
      return 1;
    case NOTIFICATION_PRIORITIES.LOW:
      return 0;
    default:
      return 0;
  }
}

/**
 * Reusable utility to calculate dynamic percentage-based notification thresholds.
 *
 * Formula:
 * totalPeriodDays = effectiveDueDate - referenceDate
 * offsetDays = Math.round(totalPeriodDays * (percentage / 100))
 * notificationDate = effectiveDueDate - offsetDays
 *
 * CRITICAL RULE (STEP 2 CORRECTION):
 * - If referenceDate is null, undefined, invalid, or greater than/equal to effectiveDueDate,
 *   DO NOT invent a fake 365-day fallback period or guess data. Return an empty array [].
 * - Percentage-based document/financial threshold notifications MUST NOT be generated from invented periods.
 *
 * Edge cases:
 * - Minimum period (short durations): if rounding causes multiple percentages
 *   to resolve to the exact same offsetDays, duplicate offsets are deduplicated
 *   by preserving only the HIGHEST priority item.
 */
export function calculatePercentageThresholds(
  referenceDateInput: Date | string | null | undefined,
  effectiveDueDateInput: Date | string | null | undefined,
): CalculatedThreshold[] {
  if (!referenceDateInput || !effectiveDueDateInput) {
    return [];
  }

  const ref = new Date(referenceDateInput);
  const due = new Date(effectiveDueDateInput);

  if (isNaN(ref.getTime()) || isNaN(due.getTime())) {
    return [];
  }

  ref.setUTCHours(0, 0, 0, 0);
  due.setUTCHours(0, 0, 0, 0);

  if (ref.getTime() >= due.getTime()) {
    return [];
  }

  const diffMs = due.getTime() - ref.getTime();
  const totalPeriodDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  const rawThresholds: Array<{ percentage: number; priority: NotificationPriority; thresholdKey: string }> = [
    { percentage: NOTIFICATION_THRESHOLDS.EARLY_WARNING_PERCENTAGE, priority: NOTIFICATION_PRIORITIES.NORMAL, thresholdKey: '30P' },
    { percentage: NOTIFICATION_THRESHOLDS.HIGH_PRIORITY_PERCENTAGE, priority: NOTIFICATION_PRIORITIES.HIGH, thresholdKey: '20P' },
    { percentage: NOTIFICATION_THRESHOLDS.URGENT_PERCENTAGE, priority: NOTIFICATION_PRIORITIES.URGENT, thresholdKey: '10P' },
    { percentage: NOTIFICATION_THRESHOLDS.EXPIRED_PERCENTAGE, priority: NOTIFICATION_PRIORITIES.URGENT, thresholdKey: '0P' },
  ];

  const mapByOffset = new Map<number, CalculatedThreshold>();

  for (const item of rawThresholds) {
    const rawOffset = totalPeriodDays * (item.percentage / 100);
    const offsetDays = Math.round(rawOffset);

    const notificationDate = new Date(due.getTime());
    notificationDate.setUTCDate(notificationDate.getUTCDate() - offsetDays);

    const candidate: CalculatedThreshold = {
      percentage: item.percentage,
      offsetDays,
      priority: item.priority,
      notificationDate,
      thresholdKey: item.thresholdKey,
    };

    if (!mapByOffset.has(offsetDays)) {
      mapByOffset.set(offsetDays, candidate);
    } else {
      const existing = mapByOffset.get(offsetDays)!;
      // Preserve highest priority when offset collision occurs
      if (getPriorityWeight(candidate.priority) > getPriorityWeight(existing.priority)) {
        mapByOffset.set(offsetDays, candidate);
      }
    }
  }

  return Array.from(mapByOffset.values()).sort((a, b) => b.offsetDays - a.offsetDays);
}
