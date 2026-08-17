import { Suspense } from 'react';
import DashboardContent from './DashboardContent';
import DashboardSkeleton from './DashboardSkeleton';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab || 'net-worth';

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent tab={tab} />
    </Suspense>
  );
}
