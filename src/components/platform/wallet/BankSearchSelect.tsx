'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Search, ChevronDown, Check, X, Landmark } from '@/components/ui/icon-library';
import { type BankItem } from '@/types/bank';

interface BankSearchSelectProps {
  banks: BankItem[];
  selectedBankId: string;
  onSelectBank: (bank: BankItem | null) => void;
  placeholder?: string;
}

export default function BankSearchSelect({
  banks,
  selectedBankId,
  onSelectBank,
  placeholder = 'Select from 157 Egyptian Banks...',
}: BankSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const selectedBank = useMemo(() => {
    return banks.find((b) => String(b.id) === String(selectedBankId)) || null;
  }, [banks, selectedBankId]);

  const filteredBanks = useMemo(() => {
    if (!searchTerm.trim()) return banks;
    const q = searchTerm.toLowerCase();
    return banks.filter(
      (b) => b.name.toLowerCase().includes(q) || (b.slug && b.slug.toLowerCase().includes(q))
    );
  }, [banks, searchTerm]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-8 w-full flex items-center justify-between px-3 rounded-xl border text-left text-xs font-sans transition-all cursor-pointer ${
          isOpen
            ? 'bg-white/[0.06] border-white/40 ring-1 ring-white/10 text-plt-text'
            : 'bg-white/[0.04] border-plt-border-soft hover:border-plt-border-strong text-plt-text'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedBank ? (
            <>
              <div className="w-5 h-5 rounded-md bg-white/[0.06] border border-white/[0.10] flex items-center justify-center overflow-hidden shrink-0">
                {selectedBank.logoUrl ? (
                  <Image
                    src={selectedBank.logoUrl}
                    alt={selectedBank.name}
                    width={18}
                    height={18}
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <Landmark size={12} className="text-plt-muted" />
                )}
              </div>
              <span className="font-semibold text-plt-text truncate font-sans">{selectedBank.name}</span>
            </>
          ) : (
            <span className="text-plt-muted truncate font-sans">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {selectedBank && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onSelectBank(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onSelectBank(null);
                }
              }}
              className="p-1 hover:bg-white/[0.08] rounded text-plt-muted hover:text-plt-text transition cursor-pointer"
              title="Clear selection"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-plt-muted transition-transform duration-200 ${isOpen ? 'rotate-180 text-plt-text' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#121216] border border-white/[0.14] rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden p-2 space-y-2 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-xl">
          {/* Search Input */}
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-2.5 text-plt-muted pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search Egyptian banks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 w-full bg-white/[0.05] border border-white/[0.10] rounded-lg pl-7 pr-7 text-xs font-sans text-white placeholder:text-plt-muted focus:outline-none focus:border-white/30"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 p-1 text-plt-muted hover:text-white cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Banks List */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {/* Option to clear / custom bank */}
            <button
              type="button"
              onClick={() => {
                onSelectBank(null);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs font-sans transition-colors cursor-pointer ${
                !selectedBank
                  ? 'bg-white/[0.10] text-white font-semibold border border-white/15'
                  : 'text-plt-text hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-white/[0.06] border border-white/[0.10] flex items-center justify-center text-plt-muted">
                  <Landmark size={12} />
                </div>
                <span>None / Custom Institution</span>
              </div>
              {!selectedBank && <Check size={14} className="text-plt-profit" />}
            </button>

            {filteredBanks.length === 0 ? (
              <div className="py-5 text-center text-xs text-plt-muted font-sans">
                No banks matching &quot;{searchTerm}&quot;
              </div>
            ) : (
              filteredBanks.map((bank) => {
                const isSelected = selectedBank?.id === bank.id;
                return (
                  <button
                    key={bank.id}
                    type="button"
                    onClick={() => {
                      onSelectBank(bank);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs font-sans transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-white/[0.10] text-white font-semibold border border-white/15'
                        : 'text-plt-text hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-5 h-5 rounded-md bg-white/[0.06] border border-white/[0.10] flex items-center justify-center overflow-hidden shrink-0">
                        {bank.logoUrl ? (
                          <Image
                            src={bank.logoUrl}
                            alt={bank.name}
                            width={18}
                            height={18}
                            className="object-contain"
                            unoptimized
                          />
                        ) : (
                          <Landmark size={12} className="text-plt-muted" />
                        )}
                      </div>
                      <span className="truncate">{bank.name}</span>
                    </div>

                    {isSelected && <Check size={14} className="text-plt-profit shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Count */}
          <div className="pt-2 px-2 border-t border-white/[0.08] flex items-center justify-between text-[10px] text-plt-muted font-sans">
            <span>{filteredBanks.length} bank{filteredBanks.length !== 1 ? 's' : ''} available</span>
            <span>Egyptian Banking Sector</span>
          </div>
        </div>
      )}
    </div>
  );
}
