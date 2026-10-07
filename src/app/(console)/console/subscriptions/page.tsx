import React from 'react';
import { connection } from 'next/server';
import { getConsoleSubscriptionsPageData } from '@/lib/server/console-queries';
import ConsoleSubscriptionsView from '@/components/platform/console/subscriptions/ConsoleSubscriptionsView';

export const dynamic = 'force-dynamic';

export default async function ConsoleSubscriptionsPage() {
  await connection();
  const data = await getConsoleSubscriptionsPageData();

  return <ConsoleSubscriptionsView data={data} />;
}
