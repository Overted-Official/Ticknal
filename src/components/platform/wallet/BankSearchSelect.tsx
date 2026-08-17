'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Search, ChevronDown, Check, X, Landmark } from 'lucide-react';
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
        className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-all ${
          isOpen
            ? 'bg-white/[0.08] border-emerald-500/50 ring-1 ring-emerald-500/20'
            : 'bg-white/5 border-white/10 hover:bg-white/[0.07] hover:border-white/20'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedBank ? (
            <>
              <div className="w-6 h-6 rounded bg-white/[0.06] border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                {selectedBank.logoUrl ? (
                  <Image
                    src={selectedBank.logoUrl}
                    alt={selectedBank.name}
                    width={20}
                    height={20}
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <Landmark size={12} className="text-white/40" />
                )}
              </div>
              <span className="font-medium text-white truncate">{selectedBank.name}</span>
            </>
          ) : (
            <>
              <Landmark size={15} className="text-white/40 shrink-0" />
              <span className="text-white/40 truncate">{placeholder}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {selectedBank && (
            <div
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
              className="p-1 hover:bg-white/10 rounded-md text-white/40 hover:text-white transition"
              title="Clear selection"
            >
              <X size={13} />
            </div>
          )}
          <ChevronDown
            size={14}
            className={`text-white/40 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#121212] border border-white/15 rounded-xl shadow-2xl overflow-hidden p-2 space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
          {/* Search Input */}
          <div className="relative flex items-center">
            <Search size={13} className="absolute left-2.5 text-white/40 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search Egyptian banks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/10 rounded-lg pl-8 pr-7 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.08]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 p-1 text-white/40 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Banks List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin">
            {/* Option to clear / custom bank */}
            <button
              type="button"
              onClick={() => {
                onSelectBank(null);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                !selectedBank
                  ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-white/[0.04] flex items-center justify-center text-white/40">
                  <Landmark size={12} />
                </div>
                <span>None / Custom Institution</span>
              </div>
              {!selectedBank && <Check size={13} className="text-emerald-400" />}
            </button>

            {filteredBanks.length === 0 ? (
              <div className="py-6 text-center text-xs text-white/40">
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
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/15 text-emerald-300 font-medium border border-emerald-500/20'
                        : 'text-white/80 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-6 h-6 rounded bg-white/[0.06] border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {bank.logoUrl ? (
                          <Image
                            src={bank.logoUrl}
                            alt={bank.name}
                            width={20}
                            height={20}
                            className="object-contain"
                            unoptimized
                          />
                        ) : (
                          <Landmark size={12} className="text-white/40" />
                        )}
                      </div>
                      <span className="truncate">{bank.name}</span>
                    </div>

                    {isSelected && <Check size={13} className="text-emerald-400 shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Count */}
          <div className="pt-1.5 px-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-white/30">
            <span>{filteredBanks.length} bank{filteredBanks.length !== 1 ? 's' : ''} available</span>
            <span>Egyptian Banking Sector</span>
          </div>
        </div>
      )}
    </div>
  );
}
