import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const production = process.argv.includes('--production');
const problems = [];

const isPlaceholder = (value = '') =>
  !value || /^(your-|replace-|sk_test|whsec_)/i.test(value.trim());

const requireValue = (name, alternative) => {
  const value = process.env[name] || (alternative ? process.env[alternative] : '');
  if (isPlaceholder(value)) {
    problems.push(alternative ? `${name} (hoặc ${alternative})` : name);
  }
  return value;
};

const appUrl = production
  ? requireValue('NEXT_PUBLIC_APP_URL')
  : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
requireValue('NEXT_PUBLIC_SUPABASE_URL');
requireValue('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

if (production) {
  requireValue('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
  requireValue('GEMINI_API_KEY');
  requireValue('PAYOS_CLIENT_ID');
  requireValue('PAYOS_API_KEY');
  requireValue('PAYOS_CHECKSUM_KEY');
  requireValue('ADMIN_AUDIT_SALT');

  if (appUrl && !appUrl.startsWith('https://')) {
    problems.push('NEXT_PUBLIC_APP_URL phải dùng HTTPS trong production');
  }
  if ((process.env.ADMIN_AUDIT_SALT || '').length < 32) {
    problems.push('ADMIN_AUDIT_SALT phải có ít nhất 32 ký tự');
  }
}

if (problems.length) {
  console.error('Cấu hình môi trường chưa sẵn sàng:');
  problems.forEach((problem) => console.error(`- ${problem}`));
  process.exit(1);
}

console.log(production ? 'Biến môi trường production hợp lệ.' : 'Biến môi trường cốt lõi hợp lệ.');
