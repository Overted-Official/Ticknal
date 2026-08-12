import { Suspense } from 'react';
import DashboardContent from './DashboardContent';
import DashboardSkeleton from './DashboardSkeleton';

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
