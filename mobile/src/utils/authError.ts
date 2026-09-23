/**
 * Authentication Error Sanitizer & Localizer for Costack Mobile
 * Ensures friendly, localized, and actionable messages without leaking internal UUIDs or technical jargon.
 */

export interface FormattedAuthError {
  title: string;
  description: string;
  type: 'expired' | 'invalid' | 'rate_limit' | 'credentials' | 'generic';
}

export function formatAuthError(error: unknown, isVietnamese: boolean = true): FormattedAuthError {
  const message = error instanceof Error ? error.message : (typeof error === 'string' ? error : '');
  const normalized = message.toLowerCase();

  // 1. Invalid credentials
  if (normalized.includes('invalid login credentials') || normalized.includes('invalid_grant')) {
    return {
      title: isVietnamese ? 'Đăng nhập không thành công' : 'Sign In Failed',
      description: isVietnamese
        ? 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.'
        : 'Incorrect email or password. Please check your credentials and try again.',
      type: 'credentials',
    };
  }

  // 2. User already registered
  if (normalized.includes('user already registered') || normalized.includes('already registered')) {
    return {
      title: isVietnamese ? 'Email đã được đăng ký' : 'Email Already Registered',
      description: isVietnamese
        ? 'Địa chỉ email này đã có tài khoản. Vui lòng chuyển sang tab Đăng nhập.'
        : 'This email is already registered. Please switch to the Sign In tab.',
      type: 'generic',
    };
  }

  // 3. Email not confirmed
  if (normalized.includes('email not confirmed')) {
    return {
      title: isVietnamese ? 'Email chưa xác minh' : 'Email Not Verified',
      description: isVietnamese
        ? 'Email chưa được xác minh. Vui lòng kiểm tra hộp thư đến (hoặc thư rác) và mở liên kết xác minh.'
        : 'Your email is not verified yet. Please check your inbox (or spam) for the verification link.',
      type: 'generic',
    };
  }

  // 4. Rate limit
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return {
      title: isVietnamese ? 'Quá nhiều yêu cầu' : 'Too Many Requests',
      description: isVietnamese
        ? 'Hệ thống nhận thấy quá nhiều lần thử. Vui lòng đợi trong giây lát rồi thử lại.'
        : 'Too many requests. Please wait a moment and try again.',
      type: 'rate_limit',
    };
  }

  // 5. Password requirements
  if (normalized.includes('password') && (normalized.includes('short') || normalized.includes('weak') || normalized.includes('character'))) {
    return {
      title: isVietnamese ? 'Mật khẩu chưa đạt chuẩn' : 'Password Requirement',
      description: isVietnamese
        ? 'Mật khẩu cần có ít nhất 8 ký tự, bao gồm chữ cái, chữ số và ký tự đặc biệt.'
        : 'The password must be at least 8 characters and include letters, numbers, and symbols.',
      type: 'generic',
    };
  }

  // Fallback: sanitize any leaked UUIDs from raw strings
  const sanitized = message
    .replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, '')
    .trim();

  return {
    title: isVietnamese ? 'Thông báo đăng nhập' : 'Authentication Notice',
    description:
      sanitized ||
      (isVietnamese
        ? 'Không thể kết nối với dịch vụ xác thực. Vui lòng kiểm tra kết nối mạng và thử lại.'
        : 'Could not connect to authentication service. Please check your connection and try again.'),
    type: 'generic',
  };
}
