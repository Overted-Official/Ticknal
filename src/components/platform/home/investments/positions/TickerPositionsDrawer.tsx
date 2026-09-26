'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from '@/components/ui/icon-library';
import TickerPositions, { type TickerOrder } from '@/components/platform/TickerPositions';
import AddOrderModal from '@/components/platform/AddOrderModal';
import EditOrderModal from '@/components/platform/EditOrderModal';
import CloseOrderModal from '@/components/platform/CloseOrderModal';
import { type HomeInvestmentOrder } from '../homeInvestmentsTypes';

export interface TickerPositionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  order: HomeInvestmentOrder | null;
  onPositionsChanged?: () => void;
  totalMarketValue?: number;
  formatMoney?: (val: number, showSign?: boolean) => string;
  isPrivacy?: boolean;
  exitSignal?: unknown;
  onSellLot?: (lot: {
    id: number;
    tickerSymbol: string;
    quantity: number;
    currentPrice: number;
  }) => void;
}

export default function TickerPositionsDrawer({
  isOpen,
  onClose,
  order,
  onPositionsChanged,
}: TickerPositionsDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [orders, setOrders] = useState<TickerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [positionsRefreshKey, setPositionsRefreshKey] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Sub-modals for actions within drawer (matches ChartWidget)
  const [isAddOrderOpen, setIsAddOrderOpen] = useState(false);
  const [selectedOrderToEdit, setSelectedOrderToEdit] = useState<{
    id: number;
    tickerSymbol: string;
    quantity: number;
    entryPrice: number;
    entryDate: string;
    companyName?: string;
    logoUrl?: string | null;
    sector?: string;
  } | null>(null);
  const [selectedOrderToClose, setSelectedOrderToClose] = useState<{
    id: number;
    tickerSymbol: string;
    quantity: number;
    currentPrice: number;
    entryPrice?: number;
    companyName?: string;
    logoUrl?: string | null;
    sector?: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset imgError when active order changes
  useEffect(() => {
    setImgError(false);
  }, [order?.tickerSymbol]);

  const symbol = order ? order.tickerSymbol : '';
  const cleanSymbol = symbol.replace('.CA', '').trim().toUpperCase();
  const displaySymbol = cleanSymbol;
  const currentPrice = order?.currentPrice ?? 0;

  // Fetch active orders for this ticker
  const fetchOrders = useCallback(async () => {
    if (!symbol) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/positions?symbol=${encodeURIComponent(symbol)}`);
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json.orders)) {
        setOrders(json.orders);
      }
    } catch (err) {
      console.error('Failed to fetch orders for positions drawer', err);
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    if (isOpen && symbol) {
      fetchOrders();
    }
  }, [isOpen, symbol, positionsRefreshKey, fetchOrders]);

  // Handle ESC key to close modals or drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isAddOrderOpen) {
          setIsAddOrderOpen(false);
        } else if (selectedOrderToEdit) {
          setSelectedOrderToEdit(null);
        } else if (selectedOrderToClose) {
          setSelectedOrderToClose(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAddOrderOpen, selectedOrderToEdit, selectedOrderToClose, onClose]);

  if (!mounted) return null;

  return (
    <>
      {createPortal(
        <AnimatePresence mode="wait">
          {isOpen && order && (
            <div
              key="ticker-positions-drawer-overlay"
              className="fixed inset-0 z-[70] flex items-end md:items-center justify-end overflow-hidden select-none pointer-events-auto"
            >
              {/* Backdrop with smooth fade in/out */}
              <motion.div
                key="ticker-positions-drawer-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
                onClick={onClose}
                aria-label="Close drawer overlay"
              />

              {/* Drawer Sheet with smooth spring motion on open & close */}
              {/* Drawer Sheet with smooth spring motion on open & close */}
              <motion.div
                key="ticker-positions-drawer-sheet"
                initial={isMobile ? { y: '100%' } : { x: '100%' }}
                animate={isMobile ? { y: 0 } : { x: 0 }}
                exit={isMobile ? { y: '100%' } : { x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                className="drawer-sheet"
              >
                {/* Header: Clean Black Surface, Integrated Mobile Drag Pill, Circular Logo & Sharp Borders */}
                <div className="drawer-header">
                  {/* Mobile Drag Indicator */}
                  <div
                    className="md:hidden w-full flex items-center justify-center pb-2 cursor-pointer"
                    onClick={onClose}
                    aria-label="Drag handle to close"
                  >
                    <div className="drawer-drag-pill" />
                  </div>

                  {/* Main Header Row */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Clean Circular Brand Logo */}
                      <div className="w-10 h-10 rounded-full bg-white border border-border-default p-1 flex items-center justify-center shrink-0 overflow-hidden">
                        {order.logoUrl && !imgError ? (
                          <img
                            src={order.logoUrl}
                            alt={cleanSymbol}
                            className="w-full h-full object-contain rounded-full"
                            onError={() => setImgError(true)}
                          />
                        ) : (
                          <span className="text-xs font-bold font-sans text-zinc-900">{displaySymbol.slice(0, 2)}</span>
                        )}
                      </div>

                      {/* Company Name & Ticker Metadata */}
                      <div className="flex flex-col min-w-0 justify-center">
                        <h2
                          className="font-semibold text-sm sm:text-base text-text-primary tracking-tight truncate font-sans leading-tight"
                          title={order.companyName || cleanSymbol}
                        >
                          {order.companyName || cleanSymbol}
                        </h2>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-1 min-w-0 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-sans font-semibold bg-surface-raised text-text-primary border border-border-subtle tracking-wider shrink-0">
                            {cleanSymbol}
                          </span>
                          {order.sector && (
                            <>
                              <span className="text-zinc-600 text-[10px] shrink-0">•</span>
                              <span className="text-xs text-zinc-400 font-normal truncate max-w-[130px] sm:max-w-xs font-sans">
                                {order.sector}
                              </span>
                            </>
                          )}
                          <span className="text-zinc-600 text-[10px] shrink-0">•</span>
                          <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-emerald-400 font-sans shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            EGX
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Live Price Quote & Action Controls */}
                    <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                      {currentPrice > 0 && (
                        <div className="hidden sm:flex flex-col items-end text-right">
                          <div className="text-sm sm:text-base font-bold text-text-primary tabular-nums tracking-tight font-sans">
                            {currentPrice.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider font-sans">
                              {['GC1!', 'SI1!'].includes(cleanSymbol) ? 'USD' : 'EGP'}
                            </span>
                          </div>
                          <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1 leading-none mt-0.5 font-sans">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Live Price
                          </span>
                        </div>
                      )}

                      {currentPrice > 0 && (
                        <div className="h-6 w-px bg-border-default hidden sm:block shrink-0" />
                      )}

                      <button
                        type="button"
                        onClick={onClose}
                        className="drawer-close-btn"
                        title="Close (Esc)"
                        aria-label="Close Positions Drawer"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6 safe-area-bottom">
                  {isLoading && orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-plt-muted gap-3">
                      <Loader2 className="w-6 h-6 animate-spin text-plt-primary" />
                      <span className="text-xs">Loading positions & orders...</span>
                    </div>
                  ) : (
                    <TickerPositions
                      symbol={symbol}
                      companyName={order?.companyName}
                      logoUrl={order?.logoUrl}
                      orders={orders}
                      currentPrice={currentPrice}
                      chartData={[]}
                      onOrdersChange={() => setPositionsRefreshKey((k) => k + 1)}
                      onEditOrder={(ord) =>
                        setSelectedOrderToEdit({
                          id: ord.id,
                          tickerSymbol: symbol,
                          quantity: ord.quantity,
                          entryPrice: ord.entryPrice,
                          entryDate: ord.entryDate,
                          companyName: order?.companyName,
                          logoUrl: order?.logoUrl,
                          sector: order?.sector,
                        })
                      }
                      onCloseOrder={(ord) =>
                        setSelectedOrderToClose({
                          id: ord.id,
                          tickerSymbol: symbol,
                          quantity: ord.quantity,
                          currentPrice: currentPrice,
                          entryPrice: ord.entryPrice,
                          companyName: order?.companyName,
                          logoUrl: order?.logoUrl,
                          sector: order?.sector,
                        })
                      }
                      onAddNew={() => setIsAddOrderOpen(true)}
                    />
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Sub-Modals (Add / Edit / Close) */}
      <AddOrderModal
        key="submodal-add-order"
        isOpen={isAddOrderOpen}
        onClose={() => setIsAddOrderOpen(false)}
        onSuccess={() => {
          setIsAddOrderOpen(false);
          setPositionsRefreshKey((k) => k + 1);
          onPositionsChanged?.();
        }}
        initialData={{
          symbol,
          companyName: order?.companyName,
          logoUrl: order?.logoUrl,
          sector: order?.sector,
          price: currentPrice,
        }}
        mode="live"
        entrySource="COMMAND_CENTER"
      />

      {selectedOrderToEdit && (
        <EditOrderModal
          key={`submodal-edit-order-${selectedOrderToEdit.id}`}
          isOpen={!!selectedOrderToEdit}
          order={selectedOrderToEdit}
          onClose={() => setSelectedOrderToEdit(null)}
          onSuccess={() => {
            setSelectedOrderToEdit(null);
            setPositionsRefreshKey((k) => k + 1);
            onPositionsChanged?.();
          }}
        />
      )}

      {selectedOrderToClose && (
        <CloseOrderModal
          key={`submodal-close-order-${selectedOrderToClose.id}`}
          isOpen={!!selectedOrderToClose}
          order={selectedOrderToClose}
          onClose={() => setSelectedOrderToClose(null)}
          onSuccess={() => {
            setSelectedOrderToClose(null);
            setPositionsRefreshKey((k) => k + 1);
            onPositionsChanged?.();
          }}
        />
      )}
    </>
  );
}
