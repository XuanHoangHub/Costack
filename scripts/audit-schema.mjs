import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error('Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc Supabase publishable/anon key để audit schema.');
  process.exit(1);
}

const tables = [
  'workspaces', 'members', 'workspace_memberships', 'workspace_invitations',
  'spaces', 'lists', 'tasks', 'docs', 'base_apps',
  'documents', 'document_collaborators', 'document_comments', 'document_versions',
  'teams', 'team_members', 'departments', 'automation_rules',
  'chat_channels', 'chat_channel_members', 'chat_messages', 'chat_read_states',
  'whiteboard_elements', 'habits', 'focus_sessions',
  'goals', 'goal_key_results',
  'finance_profiles', 'finance_accounts', 'finance_transactions', 'finance_invoices',
  'finance_debts', 'finance_budgets', 'finance_payments', 'finance_categories',
  'billing_customers', 'billing_subscriptions', 'billing_orders', 'billing_webhook_events',
  'newsletter_subscribers', 'admin_audit_logs', 'app_versions', 'app_admin_settings',
  'admin_user_profiles',
];

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  Accept: 'application/json',
};

const missing = [];
const protectedTables = [];
const failures = [];

for (const table of tables) {
  try {
    const response = await fetch(`${url}/rest/v1/${table}?select=id&limit=0`, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 404) missing.push(table);
    else if (response.status === 401 || response.status === 403) protectedTables.push(table);
    else if (!response.ok) failures.push(`${table} (${response.status})`);
  } catch (error) {
    failures.push(`${table} (${error instanceof Error ? error.message : 'network error'})`);
  }
}

if (missing.length || failures.length) {
  if (missing.length) console.error(`Thiếu bảng (${missing.length}): ${missing.join(', ')}`);
  if (failures.length) console.error(`Không kiểm tra được (${failures.length}): ${failures.join(', ')}`);
  process.exit(1);
}

console.log(`Schema nhận diện đủ ${tables.length} bảng; ${protectedTables.length} bảng từ chối anon như mong đợi.`);
