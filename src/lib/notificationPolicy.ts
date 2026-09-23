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

export type ChatMessageIdentity = {
  sender_id?: string | null;
  senderId?: string | null;
  user_id?: string | null;
  userId?: string | null;
  sender_name?: string | null;
  senderName?: string | null;
  is_ai_response?: boolean | null;
  isAi?: boolean | null;
};

export type CurrentUserIdentity = {
  id?: string | null;
  userId?: string | null;
  name?: string | null;
  email?: string | null;
};

/**
 * Xác định chính xác tin nhắn có phải do người dùng hiện tại hoặc AI gửi hay không.
 * Ngăn chặn tuyệt đối tình trạng tin nhắn của bản thân tự kích hoạt thông báo (toast/chime/unread).
 */
export const isSelfChatMessage = (
  msg: ChatMessageIdentity | null | undefined,
  currentUser: CurrentUserIdentity | null | undefined,
  sessionUserId?: string | null
): boolean => {
  if (!msg) return true;

  const senderId = (msg.sender_id || msg.senderId || '').trim();
  const isAi = Boolean(msg.is_ai_response || msg.isAi) || senderId === 'apexa-ai' || senderId === 'ai';
  if (isAi) return true;

  if (!currentUser && !sessionUserId) return false;

  // Tập hợp các định danh của người dùng hiện tại
  const ownIds = new Set<string>();
  if (currentUser?.id) ownIds.add(String(currentUser.id).trim());
  if (currentUser?.userId) ownIds.add(String(currentUser.userId).trim());
  if (sessionUserId) ownIds.add(String(sessionUserId).trim());

  // Kiểm tra phiên đăng nhập đã lưu trong localStorage nếu có
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('avaxa_session');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.user?.id) ownIds.add(String(parsed.user.id).trim());
        if (parsed?.user?.userId) ownIds.add(String(parsed.user.userId).trim());
      }
    } catch {}
  }

  const msgUserId = (msg.user_id || msg.userId || '').trim();
  const msgSenderName = (msg.sender_name || msg.senderName || '').trim().toLowerCase();
  const currentUserName = (currentUser?.name || '').trim().toLowerCase();

  // 1. Khớp ID trực tiếp với sender_id (khác 'user')
  if (senderId && senderId !== 'user' && ownIds.has(senderId)) {
    return true;
  }

  // 2. Khớp ID trực tiếp với user_id (cột Auth UID trong database Supabase)
  if (msgUserId && ownIds.has(msgUserId)) {
    return true;
  }

  // 3. Xử lý trường hợp sender_id là generic 'user'
  if (senderId === 'user') {
    // Nếu người dùng hiện tại cũng có ID là 'user'
    if (ownIds.has('user')) {
      if (!msgSenderName || !currentUserName || msgSenderName === currentUserName) {
        return true;
      }
    }
    // Nếu message có user_id khớp với Auth UID
    if (msgUserId && ownIds.has(msgUserId)) {
      return true;
    }
    // Nếu tên người gửi khớp hoàn toàn với tên người dùng hiện tại
    if (msgSenderName && currentUserName && msgSenderName === currentUserName) {
      return true;
    }
  }

  // 4. Khớp tên người gửi chính xác khi sender_id hoặc user_id là của người dùng
  if (msgSenderName && currentUserName && msgSenderName === currentUserName) {
    if (!msgUserId || ownIds.has(msgUserId) || senderId === 'user' || ownIds.has(senderId)) {
      return true;
    }
  }

  return false;
};


