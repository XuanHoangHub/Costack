import type { Metadata } from 'next';
import AdminDashboard from '@/components/admin/AdminDashboard';

export const metadata: Metadata = {
  title: 'Apexa Control Center',
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default function AdminPage() {
  return <AdminDashboard />;
}
