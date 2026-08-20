import type {
  Attachment,
  Comment,
  RecurringTemplate,
  SmartSuggestion,
  SmartSuggestionStatus,
} from '@debtulator/domain/models';
import type {
  CreateAttachmentInput,
  CreateCommentInput,
  CreateRecurringTemplateInput,
  CreateReminderInput,
  CreateSmartSuggestionInput,
  CreateSoftReminderInput,
} from '../LocalLedgerTypes';
import { requireEntity, type LocalLedgerCoordinator } from './shared';

export function createContentCommands(coordinator: LocalLedgerCoordinator) {
  return {
    createRecurringTemplate: (input: CreateRecurringTemplateInput) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.createRecurringTemplate(input),
      ),
    updateRecurringTemplate: (
      templateId: string,
      input: Partial<CreateRecurringTemplateInput> & {
        status?: RecurringTemplate['status'];
      },
    ) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.updateRecurringTemplate(
          requireEntity(
            current.recurringTemplates,
            templateId,
            'Recurring template',
          ),
          input,
        ),
      ),
    generateDueRecurringRecords: () =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.generateDueRecurringRecords(),
      ),
    createReminder: (input: CreateReminderInput) =>
      coordinator.execute((unitOfWork) => unitOfWork.createReminder(input)),
    createSoftReminder: (input: CreateSoftReminderInput) =>
      coordinator.execute((unitOfWork) => unitOfWork.createSoftReminder(input)),
    createAttachment: (input: CreateAttachmentInput) =>
      coordinator.execute((unitOfWork) => unitOfWork.createAttachment(input)),
    upsertAttachment: (attachment: Attachment) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.upsertAttachment(attachment),
      ),
    archiveAttachment: (
      attachmentId: string,
      actorUserId: string | null = null,
    ) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.archiveAttachment(
          requireEntity(current.attachments, attachmentId, 'Attachment'),
          actorUserId,
        ),
      ),
    upsertComment: (comment: Comment) =>
      coordinator.execute((unitOfWork) => unitOfWork.upsertComment(comment)),
    createComment: (input: CreateCommentInput) =>
      coordinator.execute((unitOfWork) => unitOfWork.createComment(input)),
    updateComment: (commentId: string, input: Partial<CreateCommentInput>) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.updateComment(
          requireEntity(current.comments, commentId, 'Comment'),
          input,
        ),
      ),
    deleteComment: (
      commentId: string,
      actorUserId: string | null = null,
    ) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.deleteComment(
          requireEntity(current.comments, commentId, 'Comment'),
          actorUserId,
        ),
      ),
    upsertSmartSuggestion: (
      input: SmartSuggestion | CreateSmartSuggestionInput,
    ) =>
      coordinator.execute((unitOfWork) =>
        unitOfWork.upsertSmartSuggestion(input),
      ),
    setSmartSuggestionStatus: (
      suggestionId: string,
      status: SmartSuggestionStatus,
    ) =>
      coordinator.execute((unitOfWork, current) =>
        unitOfWork.setSmartSuggestionStatus(
          requireEntity(
            current.smartSuggestions,
            suggestionId,
            'Smart suggestion',
          ),
          status,
        ),
      ),
  };
}

export type ContentCommands = ReturnType<typeof createContentCommands>;
