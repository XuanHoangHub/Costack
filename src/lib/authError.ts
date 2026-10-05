/**
 * Authentication and MFA Error Sanitizer & Localizer for Apexa
 * Keeps authentication feedback actionable without exposing provider internals.
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
        ? 'Mã xác thực đã hết hạn. Vui lòng làm mới yêu cầu xác minh và nhập mã 6 chữ số mới nhất từ ứng dụng Authenticator.'
        : 'The verification code has expired. Refresh the verification request, then enter the latest 6-digit code from your authenticator app.',
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

  if (
    normalized.includes('email link is invalid') ||
    normalized.includes('email link is expired') ||
    normalized.includes('verification link has expired')
  ) {
    return {
      title: isVietnamese ? 'Liên kết xác minh không còn hiệu lực' : 'Verification Link No Longer Valid',
      description: isVietnamese
        ? 'Liên kết xác minh đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu gửi liên kết mới.'
        : 'The verification link has expired or was already used. Request a new link to continue.',
      type: 'expired',
    };
  }

  // 5. Email already registered
  if (normalized.includes('user already registered') || normalized.includes('email address already exists')) {
    return {
      title: isVietnamese ? 'Email đã tồn tại' : 'Email Already Registered',
      description: isVietnamese
        ? 'Email này đã được đăng ký tài khoản. Vui lòng chuyển sang đăng nhập.'
        : 'This email is already registered. Please sign in instead.',
      type: 'generic',
    };
  }

  // 6. Rate limits
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return {
      title: isVietnamese ? 'Quá nhiều yêu cầu' : 'Too Many Requests',
      description: isVietnamese
        ? 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi một lát rồi thử lại.'
        : 'Too many requests. Please wait a moment before trying again.',
      type: 'rate_limit',
    };
  }

  // 7. Invalid email address
  if (normalized.includes('invalid email') || (normalized.includes('email address') && normalized.includes('invalid'))) {
    return {
      title: isVietnamese ? 'Địa chỉ email không hợp lệ' : 'Invalid Email Address',
      description: isVietnamese
        ? 'Vui lòng kiểm tra định dạng địa chỉ email và thử lại.'
        : 'Check the email address format and try again.',
      type: 'invalid',
    };
  }

  // 8. Registration is disabled
  if (
    normalized.includes('signup is disabled') ||
    normalized.includes('signups not allowed') ||
    normalized.includes('registration is currently disabled') ||
    normalized.includes('đăng ký mới hiện đang tạm khóa')
  ) {
    return {
      title: isVietnamese ? 'Chưa thể đăng ký' : 'Sign-Up Unavailable',
      description: isVietnamese
        ? 'Hiện chưa thể tạo tài khoản mới. Vui lòng đăng nhập bằng tài khoản hiện có.'
        : 'New account registration is currently unavailable. Sign in with an existing account.',
      type: 'generic',
    };
  }

  if (
    normalized.includes('no verified authenticator') ||
    normalized.includes('không tìm thấy thiết bị xác thực đã đăng ký')
  ) {
    return {
      title: isVietnamese ? 'Chưa có thiết bị xác thực' : 'No Authenticator Found',
      description: isVietnamese
        ? 'Không tìm thấy ứng dụng xác thực đã đăng ký cho tài khoản này. Vui lòng kiểm tra thiết lập xác thực hai bước.'
        : 'No verified authenticator is registered for this account. Check your two-factor authentication setup.',
      type: 'generic',
    };
  }

  // 9. Password requirements
  if (normalized.includes('password')) {
    return {
      title: isVietnamese ? 'Mật khẩu chưa đáp ứng' : 'Password Requirements',
      description: isVietnamese
        ? 'Mật khẩu chưa đáp ứng yêu cầu bảo mật. Vui lòng chọn mật khẩu khác.'
        : 'The password does not meet security requirements. Please choose a different password.',
      type: 'generic',
    };
  }

  // 10. General MFA / 2FA failure
  if (normalized.includes('mfa') || normalized.includes('factor')) {
    return {
      title: isVietnamese ? 'Xác thực hai bước thất bại' : '2FA Verification Failed',
      description: isVietnamese
        ? 'Không thể hoàn tất xác thực hai bước. Vui lòng kiểm tra lại ứng dụng Authenticator hoặc thử lại.'
        : 'Could not complete two-factor authentication. Please check your Authenticator app and try again.',
      type: 'generic',
    };
  }

  if (normalized.includes('failed to fetch') || normalized.includes('network request failed') || normalized.includes('fetch failed')) {
    return {
      title: isVietnamese ? 'Không thể kết nối' : 'Connection Failed',
      description: isVietnamese
        ? 'Không thể kết nối với dịch vụ xác thực. Vui lòng kiểm tra kết nối mạng và thử lại.'
        : 'Could not connect to the authentication service. Check your internet connection and try again.',
      type: 'generic',
    };
  }

  return {
    title: isVietnamese ? 'Không thể xác thực' : 'Authentication Failed',
    description: isVietnamese
      ? 'Đã xảy ra sự cố khi xác thực. Vui lòng thử lại; nếu sự cố tiếp diễn, hãy liên hệ bộ phận hỗ trợ.'
      : 'Something went wrong while authenticating. Try again, or contact support if the issue continues.',
    type: 'generic',
  };
}
