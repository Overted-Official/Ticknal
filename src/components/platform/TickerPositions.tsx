import React from 'react';

export interface TickerOrder {
  id: number;
  status: string;
  side: string;
  entryDate: string;
  entryPrice: number;
  quantity: number;
  targetPrice: number | null;
  stopPrice: number | null;
  exitDate: string | null;
  exitPrice: number | null;
}

interface TickerPositionsProps {
  symbol: string;
  orders: TickerOrder[];
  currentPrice: number;
}

function formatMoney(value: number, showSign: boolean = false): string {
  const formatted = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sign = showSign && value >= 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatted} EGP`;
}

function formatPrice(value: number): string {
  return `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
}

export default function TickerPositions({ symbol, orders, currentPrice }: TickerPositionsProps) {
  const openOrders = orders.filter(o => o.status === 'OPEN');
  const closedOrders = orders.filter(o => o.status === 'CLOSED');

  // Summary Metrics
  const totalInvested = openOrders.reduce((sum, order) => sum + order.entryPrice * order.quantity, 0);
  const unrealizedPl = openOrders.reduce((sum, order) => sum + (currentPrice - order.entryPrice) * order.quantity, 0);
  const realizedPl = closedOrders.reduce((sum, order) => {
    const exitP = order.exitPrice ?? order.entryPrice;
    return sum + (exitP - order.entryPrice) * order.quantity;
  }, 0);

  const displayOrders = [...openOrders, ...closedOrders];

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-transparent text-white p-6 space-y-6">
      
      {/* Summary Cards */}
      <div>
        <h2 className="text-sm font-medium tracking-[-0.02em] mb-2 text-white">{symbol.replace('.CA', '')} Position Summary</h2>
        <div className="border border-white/[0.09] rounded-md bg-black divide-x divide-white/[0.06] grid grid-cols-3 overflow-hidden">
          <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
            <div className="text-[11px] text-white/40 font-medium truncate font-mono">Invested</div>
            <div className="mt-1 text-sm font-semibold font-mono text-white truncate">{formatMoney(totalInvested)}</div>
          </div>
          <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
            <div className="text-[11px] text-white/40 font-medium truncate font-mono">Unrealized P/L</div>
            <div className={`mt-1 text-sm font-semibold font-mono truncate ${unrealizedPl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {formatMoney(unrealizedPl, true)}
            </div>
          </div>
          <div className="p-5 flex flex-col justify-between hover:bg-white/[0.015] transition-colors">
            <div className="text-[11px] text-white/40 font-medium truncate font-mono">Realized P/L</div>
            <div className={`mt-1 text-sm font-semibold font-mono truncate ${realizedPl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
              {formatMoney(realizedPl, true)}
            </div>
          </div>
        </div>
      </div>

      {/* Position Detail Cards */}
      <div>
        <h2 className="text-sm font-medium tracking-[-0.02em] mb-2 text-white">Order History</h2>
        {displayOrders.length === 0 ? (
          <div className="text-xs text-white/40 text-center py-8 border border-white/[0.09] rounded-md border-dashed bg-white/[0.01]">
            No tracked positions for {symbol.replace('.CA', '')}
          </div>
        ) : (
          <div className="space-y-2 pb-8">
            {displayOrders.map(order => {
              const isOpen = order.status === 'OPEN';
              const pl = isOpen 
                ? (currentPrice - order.entryPrice) * order.quantity
                : ((order.exitPrice ?? order.entryPrice) - order.entryPrice) * order.quantity;
              const plPct = order.entryPrice > 0 ? (pl / (order.entryPrice * order.quantity)) * 100 : 0;

              return (
                <div key={order.id} className="border border-white/[0.09] rounded-md bg-black p-5 flex flex-col space-y-2.5 relative overflow-hidden">
                  {/* Left accent strip based on status */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${isOpen ? 'bg-plt-orange' : 'bg-white/10'}`} />
                  
                  <div className="flex justify-between items-start ml-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-[4px] font-medium ${
                          isOpen ? 'bg-white/[0.06] border border-white/[0.09] text-white' : 'bg-white/[0.02] text-white/40'
                        }`}>
                          {isOpen ? 'OPEN' : 'CLOSED'}
                        </span>
                        <span className="text-xs text-white/40 font-mono">{order.entryDate}</span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className={`text-sm font-semibold ${pl >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                        {formatMoney(pl, true)}
                      </div>
                      <div className={`text-[10px] ${plPct >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                        {plPct >= 0 ? '+' : ''}{plPct.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-white/[0.04] ml-2 font-mono">
                    <div>
                      <span className="text-white/40 text-[10px] block font-sans">Entry</span>
                      <span className="text-white font-medium">{formatPrice(order.entryPrice)}</span>
                    </div>
                    <div>
                      <span className="text-white/40 text-[10px] block font-sans">Current / Exit</span>
                      <span className="text-white font-medium">{isOpen ? formatPrice(currentPrice) : formatPrice(order.exitPrice ?? 0)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white/40 text-[10px] block font-sans">Quantity</span>
                      <span className="text-white font-medium">{order.quantity}</span>
                    </div>
                  </div>

                  {(order.targetPrice || order.stopPrice) && (
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/[0.04] ml-2 font-mono">
                      <div>
                        <span className="text-white/40 text-[10px] block font-sans">Target Price</span>
                        <span className="text-[#22c55e]">{order.targetPrice ? formatPrice(order.targetPrice) : '-'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-white/40 text-[10px] block font-sans">Stop Loss</span>
                        <span className="text-[#ef4444]">{order.stopPrice ? formatPrice(order.stopPrice) : '-'}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
