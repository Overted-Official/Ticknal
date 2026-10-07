import React from 'react';
import { connection } from 'next/server';
import { getConsoleUsersPageData } from '@/lib/server/console-queries';
import ConsoleUsersView from '@/components/platform/console/users/ConsoleUsersView';

export const dynamic = 'force-dynamic';

export default async function ConsoleUsersPage() {
  await connection();
  const data = await getConsoleUsersPageData();

  return <ConsoleUsersView data={data} />;
}

