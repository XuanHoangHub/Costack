export type NotificationDeliveryOptions = {
  persistInInbox?: boolean;
  taskId?: string;
  workspaceId?: string;
};

type NotificationLike = {
  type?: string;
  title?: string;
  message?: string;
};

const normalize = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9@]+/g, ' ')
    .trim();

/**
 * Creation is direct feedback for the action the current user just completed.
 * It must not become a toast or a durable Inbox item.
 */
export const isCreationConfirmation = ({ title = '', message = '' }: NotificationLike) => {
  const text = normalize(`${title} ${message}`);
  const creationPhrases = [
    'created',
    'new task',
    'new space',
    'new workspace',
    'new list',
    'new folder',
    'new document',
    'new whiteboard',
    'quick add',
    'workspace launched',
    'automation created',
    'goal created',
    'chat room created',
    'record submitted',
    'da tao',
    'da them',
    'them cong viec',
    'tao space',
    'tao workspace',
    'tao thanh cong',
  ];

  return creationPhrases.some((phrase) => text.includes(phrase));
};

const isAttentionEvent = ({ type = '', title = '', message = '' }: NotificationLike) => {
  const text = normalize(`${title} ${message}`);

  if (['deadline', 'comment', 'message', 'chat_message', 'system', 'warning', 'error'].includes(type)) return true;
  if (type === 'assignment' && !isCreationConfirmation({ type, title, message })) return true;

  return [
    'invitation',
    'invited you',
    'loi moi',
    'mention',
    'deadline',
    'han chot',
    'warning',
    'canh bao',
    'error',
    'failed',
    'failure',
    'loi ',
    'security',
    'bao mat',
    'assignee changed',
    'action required',
    'thong bao',
    'nhac nho',
  ].some((phrase) => text.includes(phrase));
};

export const shouldPersistInInbox = (
  notification: NotificationLike,
  options?: NotificationDeliveryOptions,
) => {
  if (typeof options?.persistInInbox === 'boolean') return options.persistInInbox;
  if (isCreationConfirmation(notification)) return false;
  return isAttentionEvent(notification);
};

export const sanitizeInboxNotifications = <T extends NotificationLike>(notifications: T[]): T[] =>
  notifications.filter((notification) => {
    if (isCreationConfirmation(notification)) return false;
    return true;
  });

