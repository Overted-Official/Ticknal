import React from 'react';
import { connection } from 'next/server';
import { getConsoleUsersPageData } from '@/lib/server/console-queries';
import ConsoleUsersView from '@/components/platform/console/users/ConsoleUsersView';
import { assertAdminUser } from '@/lib/server/admin-guard';
import { isProprietaryOwner } from '@/lib/strategies/proprietary-access-policy';

export const dynamic = 'force-dynamic';

export default async function ConsoleUsersPage() {
  await connection();
  const [data, admin] = await Promise.all([getConsoleUsersPageData(), assertAdminUser()]);

  return <ConsoleUsersView data={data} canManageProprietaryAccess={isProprietaryOwner(admin.user.email, admin.profile.role)} />;
}
