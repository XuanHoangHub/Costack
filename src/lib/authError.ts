/**
 * Authentication and MFA Error Sanitizer & Localizer for Apexa
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

  // 1. MFA Challenge Expired
  if (
    normalized.includes('mfa challenge') ||
    (normalized.includes('challenge') && (normalized.includes('expired') || normalized.includes('invalid') || normalized.includes('create a new challenge'))) ||
    normalized.includes('factor_challenge_expired')
  ) {
    return {
      title: isVietnamese ? 'Mã xác thực đã hết hạn' : 'Verification Code Expired',
      description: isVietnamese
        ? 'Phiên xác thực trước đã hết hiệu lực. Costack đã tự động tạo phiên mới, bạn vui lòng nhập mã 6 số mới nhất từ ứng dụng Authenticator.'
        : 'The verification challenge has timed out. Costack has refreshed the session—please enter the latest 6-digit code from your Authenticator app.',
      type: 'expired',
    };
  }

  // 2. Invalid TOTP / MFA code
  if (
    normalized.includes('invalid totp') ||
    normalized.includes('totp') ||
    (normalized.includes('code') && (normalized.includes('invalid') || normalized.includes('incorrect') || normalized.includes('expired')))
  ) {
    return {
      title: isVietnamese ? 'Mã xác thực không chính xác' : 'Invalid Verification Code',
      description: isVietnamese
        ? 'Mã OTP gồm 6 chữ số chưa đúng hoặc đã hết hạn. Vui lòng kiểm tra lại thời gian trên thiết bị và nhập mã mới từ ứng dụng Authenticator.'
        : 'The 6-digit OTP code is incorrect or expired. Please check your device time and Authenticator app.',
      type: 'invalid',
    };
  }

  // 3. Invalid credentials
  if (normalized.includes('invalid login credentials') || normalized.includes('invalid_grant')) {
    return {
      title: isVietnamese ? 'Đăng nhập không thành công' : 'Sign In Failed',
      description: isVietnamese
        ? 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra và thử lại.'
        : 'Incorrect email or password. Please check your credentials and try again.',
      type: 'credentials',
    };
  }

  // 4. Email not confirmed
  if (normalized.includes('email not confirmed')) {
    return {
      title: isVietnamese ? 'Email chưa xác minh' : 'Email Not Verified',
      description: isVietnamese
        ? 'Email chưa được xác minh. Vui lòng kiểm tra hộp thư đến và mở liên kết xác minh.'
        : 'Your email is not verified yet. Please check your inbox for the verification link.',
      type: 'generic',
    };
  }

  // 5. User already registered
  if (normalized.includes('user already registered')) {
    return {
      title: isVietnamese ? 'Email đã tồn tại' : 'Email Already Registered',
      description: isVietnamese
        ? 'Email này đã được đăng ký tài khoản. Vui lòng chuyển sang đăng nhập.'
        : 'This email is already registered. Please sign in instead.',
      type: 'generic',
    };
  }

  // 6. Rate limit
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return {
      title: isVietnamese ? 'Quá nhiều yêu cầu' : 'Too Many Requests',
      description: isVietnamese
        ? 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi một lát rồi thử lại.'
        : 'Too many requests. Please wait a moment and try again.',
      type: 'rate_limit',
    };
  }

  // 7. Password requirements
  if (normalized.includes('password')) {
    return {
      title: isVietnamese ? 'Mật khẩu chưa đáp ứng' : 'Password Requirement',
      description: isVietnamese
        ? 'Mật khẩu chưa đáp ứng yêu cầu bảo mật. Vui lòng chọn mật khẩu khác.'
        : 'The password does not meet security requirements. Please choose a different password.',
      type: 'generic',
    };
  }

  // 8. General MFA / 2FA failure
  if (normalized.includes('mfa') || normalized.includes('factor')) {
    return {
      title: isVietnamese ? 'Xác thực hai bước thất bại' : '2FA Verification Failed',
      description: isVietnamese
        ? 'Không thể hoàn tất xác thực hai bước. Vui lòng kiểm tra lại ứng dụng Authenticator hoặc thử lại.'
        : 'Could not complete two-factor authentication. Please check your Authenticator app and try again.',
      type: 'generic',
    };
  }

  // Fallback: sanitize any leaked UUIDs from raw strings
  const sanitized = message.replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, '').trim();

  return {
    title: isVietnamese ? 'Thông báo' : 'Notification',
    description: sanitized || (isVietnamese ? 'Không thể kết nối với dịch vụ xác thực. Vui lòng thử lại.' : 'Could not connect to the authentication service. Try again.'),
    type: 'generic',
  };
}
