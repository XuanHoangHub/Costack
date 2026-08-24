import { getAdminOverview } from '@/lib/admin/data';
import { adminErrorResponse, adminJson, requireSuperAdmin } from '@/lib/admin/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { admin } = await requireSuperAdmin(request);
    return adminJson({ overview: await getAdminOverview(admin) });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
