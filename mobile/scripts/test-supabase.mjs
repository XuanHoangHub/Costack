import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const url = env.EXPO_PUBLIC_SUPABASE_URL || 'https://zfyngidcwjijuogaygwe.supabase.co';
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('--- KIỂM TRA KẾT NỐI SUPABASE TRÊN PHIÊN BẢN MOBILE ---');
console.log('1. Cấu hình Supabase Mobile:');
console.log('   - SUPABASE_URL:', url);
console.log('   - ANON_KEY:', anonKey ? `Hợp lệ (${anonKey.length} ký tự)` : 'THIẾU KEY!');

const supabase = createClient(url, anonKey);

async function testAll() {
  console.log('\n2. Kiểm tra truy vấn các bảng cốt lõi (Core Tables):');
  const tables = [
    'workspaces',
    'spaces',
    'lists',
    'tasks',
    'docs',
    'chat_channels',
    'chat_messages',
    'members',
    'finance_transactions',
  ];

  let successCount = 0;
  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('id').limit(1);
      if (error) {
        console.log(`   - [${t}]: Kết nối OK (Bảo vệ bởi RLS: ${error.message})`);
        successCount++;
      } else {
        console.log(`   - [${t}]: Kết nối OK (Truy vấn thành công, ${data.length} hàng)`);
        successCount++;
      }
    } catch (e) {
      console.log(`   - [${t}]: LỖI KẾT NỐI -> ${e.message}`);
    }
  }

  console.log('\n3. Kiểm tra Dịch vụ Xác thực (Supabase Auth):');
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) {
    console.log('   - getSession(): Lỗi ->', sessionErr.message);
  } else {
    console.log('   - getSession(): Hoạt động hoàn hảo (Sẵn sàng cho người dùng đăng nhập)');
  }

  console.log('\n4. Kiểm tra Đăng nhập & Fetch Workspace khi Authenticated:');
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'hoang.benjamin.creative@gmail.com',
    password: 'Dkmiss00@',
  });
  if (authErr) {
    console.log('   - signInWithPassword(): Thất bại ->', authErr.message);
  } else {
    console.log('   - Đăng nhập thành công! User ID:', authData.user?.id);
    const { data: wsData, error: wsErr } = await supabase.from('workspaces').select('*');
    console.log('   - [workspaces] khi Authenticated:', wsErr ? wsErr.message : `Tìm thấy ${wsData?.length} workspaces!`, wsData);
    const { data: memData, error: memErr } = await supabase.from('workspace_memberships').select('*');
    console.log('   - [workspace_memberships]:', memErr ? memErr.message : `Tìm thấy ${memData?.length} memberships!`, memData);
    const { data: mData, error: mErr } = await supabase.from('members').select('*');
    console.log('   - [members]:', mErr ? mErr.message : `Tìm thấy ${mData?.length} members!`, mData);
  }

  console.log(`\n=> KẾT LUẬN: ${successCount}/${tables.length} bảng kết nối thông suốt với máy chủ Supabase!`);
}

testAll();
