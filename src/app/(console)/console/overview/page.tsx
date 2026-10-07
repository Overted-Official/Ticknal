import React from 'react';
import { connection } from 'next/server';
import { getConsoleOverviewStats } from '@/lib/server/console-queries';
import ConsoleOverviewView from '@/components/platform/console/overview/ConsoleOverviewView';

export const dynamic = 'force-dynamic';

export default async function ConsoleOverviewPage() {
  await connection();
  const stats = await getConsoleOverviewStats();

  return <ConsoleOverviewView stats={stats} />;
}
