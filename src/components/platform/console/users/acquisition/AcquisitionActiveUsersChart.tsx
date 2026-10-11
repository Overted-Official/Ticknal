'use client';

import React from 'react';
import type { ConsoleAcquisitionStats } from '@/lib/server/console-queries';
import AcquisitionPlatformActivityChart from './AcquisitionPlatformActivityChart';

interface ActiveUsersChartProps {
  trendData?: ConsoleAcquisitionStats['activeUsersTrend'];
  activity?: ConsoleAcquisitionStats['platformActivity'];
}

export default function AcquisitionActiveUsersChart(props: ActiveUsersChartProps) {
  return <AcquisitionPlatformActivityChart {...props} />;
}
