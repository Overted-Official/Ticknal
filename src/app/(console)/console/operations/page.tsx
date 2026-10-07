import React from 'react';
import { connection } from 'next/server';
import { getConsoleOperationsPageData } from '@/lib/server/console-queries';
import ConsoleOperationsView from '@/components/platform/console/operations/ConsoleOperationsView';

export const dynamic = 'force-dynamic';

export default async function ConsoleOperationsPage() {
  await connection();
  const data = await getConsoleOperationsPageData();

  return <ConsoleOperationsView data={data} />;
}
