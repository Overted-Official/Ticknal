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
    <div className="flex flex-col h-full overflow-y-auto bg-transparent text-white p-4 space-y-6">
      
      {/* Summary Cards */}
      <div>
        <h2 className="text-sm font-medium tracking-[-0.02em] mb-3 text-white">{symbol.replace('.CA', '')} Position Summary</h2>
        <div className="grid grid-cols-3 gap-2.5">
          <div className="glass-panel glass-panel-hover rounded-2xl p-3.5 shadow-xl">
            <div className="text-[10px] uppercase font-medium tracking-[0.06em] text-white/40 truncate font-mono">Invested</div>
            <div className="mt-1 text-sm font-bold font-mono text-white truncate">{formatMoney(totalInvested)}</div>
          </div>
          <div className="glass-panel glass-panel-hover rounded-2xl p-3.5 shadow-xl">
            <div className="text-[10px] uppercase font-medium tracking-[0.06em] text-white/40 truncate font-mono">Unrealized P/L</div>
            <div className={`mt-1 text-sm font-bold font-mono truncate ${unrealizedPl >= 0 ? 'text-[#00e676]' : 'text-[#ff4d58]'}`}>
              {formatMoney(unrealizedPl, true)}
            </div>
          </div>
          <div className="glass-panel glass-panel-hover rounded-2xl p-3.5 shadow-xl">
            <div className="text-[10px] uppercase font-medium tracking-[0.06em] text-white/40 truncate font-mono">Realized P/L</div>
            <div className={`mt-1 text-sm font-bold font-mono truncate ${realizedPl >= 0 ? 'text-[#00e676]' : 'text-[#ff4d58]'}`}>
              {formatMoney(realizedPl, true)}
            </div>
          </div>
        </div>
      </div>

      {/* Position Detail Cards */}
      <div>
        <h2 className="text-sm font-medium tracking-[-0.02em] mb-3 text-white">Order History</h2>
        {displayOrders.length === 0 ? (
          <div className="text-xs text-white/40 text-center py-8 border border-white/[0.08] rounded-2xl border-dashed bg-white/[0.01]">
            No tracked positions for {symbol.replace('.CA', '')}
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            {displayOrders.map(order => {
              const isOpen = order.status === 'OPEN';
              const pl = isOpen 
                ? (currentPrice - order.entryPrice) * order.quantity
                : ((order.exitPrice ?? order.entryPrice) - order.entryPrice) * order.quantity;
              const plPct = order.entryPrice > 0 ? (pl / (order.entryPrice * order.quantity)) * 100 : 0;

              return (
                <div key={order.id} className="glass-panel rounded-2xl p-4 flex flex-col space-y-3 shadow-xl relative overflow-hidden">
                  {/* Left accent strip based on status */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${isOpen ? 'bg-plt-orange shadow-[0_0_8px_#ff640d]' : 'bg-white/10'}`} />
                  
                  <div className="flex justify-between items-start ml-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                          isOpen ? 'bg-white/[0.08] border border-white/[0.12] text-white' : 'bg-white/[0.02] text-white/40'
                        }`}>
                          {isOpen ? 'OPEN' : 'CLOSED'}
                        </span>
                        <span className="text-xs text-white/40 font-mono">{order.entryDate}</span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className={`text-sm font-bold ${pl >= 0 ? 'text-[#00e676]' : 'text-[#ff4d58]'}`}>
                        {formatMoney(pl, true)}
                      </div>
                      <div className={`text-[10px] ${plPct >= 0 ? 'text-[#00e676]' : 'text-[#ff4d58]'}`}>
                        {plPct >= 0 ? '+' : ''}{plPct.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pt-3 border-t border-white/[0.06] ml-2 font-mono">
                    <div>
                      <span className="text-white/40 text-[9px] uppercase tracking-wider block font-sans">Entry</span>
                      <span className="text-white font-medium">{formatPrice(order.entryPrice)}</span>
                    </div>
                    <div>
                      <span className="text-white/40 text-[9px] uppercase tracking-wider block font-sans">Current / Exit</span>
                      <span className="text-white font-medium">{isOpen ? formatPrice(currentPrice) : formatPrice(order.exitPrice ?? 0)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white/40 text-[9px] uppercase tracking-wider block font-sans">Quantity</span>
                      <span className="text-white font-medium">{order.quantity}</span>
                    </div>
                  </div>

                  {(order.targetPrice || order.stopPrice) && (
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/[0.04] ml-2 font-mono">
                      <div>
                        <span className="text-white/40 text-[9px] uppercase tracking-wider block font-sans">Target Price</span>
                        <span className="text-[#00e676]">{order.targetPrice ? formatPrice(order.targetPrice) : '-'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-white/40 text-[9px] uppercase tracking-wider block font-sans">Stop Loss</span>
                        <span className="text-[#ff4d58]">{order.stopPrice ? formatPrice(order.stopPrice) : '-'}</span>
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
