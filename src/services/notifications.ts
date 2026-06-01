import type { AppNotification, AppSettings, NotificationType } from '@/src/types/models';

export function notificationEnabled(type: NotificationType, settings: AppSettings) {
  if (type === 'sync_problem' || type === 'export_ready') {
    return true;
  }
  if (type.startsWith('verification')) {
    return settings.notificationVerificationEnabled;
  }
  if (type.startsWith('event') || type === 'claim_request' || type === 'duplicate_warning') {
    return settings.notificationEventEnabled;
  }
  if (type === 'payment' || type === 'settlement') {
    return settings.notificationPaymentSettlementEnabled;
  }
  if (type === 'reminder') {
    return settings.notificationReminderEnabled;
  }
  if (type === 'comment') {
    return settings.notificationCommentEnabled;
  }
  return true;
}

export function privacySafeNotificationBody(notification: Pick<AppNotification, 'body' | 'type'>, settings: AppSettings) {
  if (settings.showSensitiveDetailsInNotifications) {
    return notification.body;
  }
  switch (notification.type) {
    case 'payment':
    case 'settlement':
    case 'verification_request':
    case 'verification_result':
      return 'Open Debtulator to review the financial update.';
    default:
      return notification.body;
  }
}

export function isInsideQuietHours(settings: AppSettings, date = new Date()) {
  if (!settings.quietHoursEnabled) {
    return false;
  }
  const minutes = date.getHours() * 60 + date.getMinutes();
  const start = parseClock(settings.quietHoursStart);
  const end = parseClock(settings.quietHoursEnd);
  return start <= end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

function parseClock(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
}
