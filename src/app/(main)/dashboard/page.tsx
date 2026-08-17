import { Suspense } from 'react';
import DashboardContent from './DashboardContent';
import DashboardSkeleton from './DashboardSkeleton';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab || 'investments';

  return (
    <Suspense key={tab} fallback={<DashboardSkeleton />}>
      <DashboardContent tab={tab} />
    </Suspense>
  );
}
