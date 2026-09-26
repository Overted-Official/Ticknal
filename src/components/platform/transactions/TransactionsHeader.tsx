'use client';

import React from 'react';
import Link from 'next/link';

export default function TransactionsHeader() {
  return (
    <header className="flex items-center justify-between gap-4 select-none pb-1">
      {/* Left: Breadcrumb & Title */}
      <div className="flex items-center gap-1.5 text-xs md:text-sm">
        <Link
          href="/home"
          className="text-text-muted font-normal hover:text-text-primary transition-colors"
        >
          Home
        </Link>
        <span className="text-text-muted">/</span>
        <h1 className="font-semibold text-text-primary">
          Transactions
        </h1>
      </div>
    </header>
  );
}
