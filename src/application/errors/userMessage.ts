export type AppErrorCode =
  | 'network_error'
  | 'auth_error'
  | 'permission_error'
  | 'sync_conflict'
  | 'validation_error'
  | 'storage_error'
  | 'export_import_error'
  | 'notification_permission_error'
  | 'database_migration_error'
  | 'unexpected_error';

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly recovery?: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export function userMessageForError(error: unknown) {
  if (error instanceof AppError) {
    return {
      title: titleForCode(error.code),
      body: error.message,
      recovery: error.recovery ?? 'Try again, or review the related record before continuing.',
    };
  }
  return {
    title: 'Something went wrong',
    body: 'Debtulator could not complete that action safely.',
    recovery: 'No data was intentionally discarded. Try again from the current screen.',
  };
}

function titleForCode(code: AppErrorCode) {
  switch (code) {
    case 'network_error':
      return 'Network unavailable';
    case 'auth_error':
      return 'Session needs attention';
    case 'permission_error':
      return 'Permission denied';
    case 'sync_conflict':
      return 'Conflict needs review';
    case 'validation_error':
      return 'Check the entered values';
    case 'storage_error':
      return 'Attachment storage failed';
    case 'export_import_error':
      return 'Export or restore failed';
    case 'notification_permission_error':
      return 'Notification permission unavailable';
    case 'database_migration_error':
      return 'Local database needs attention';
    case 'unexpected_error':
      return 'Unexpected error';
  }
}
