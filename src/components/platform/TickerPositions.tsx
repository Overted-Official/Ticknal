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
    <div className="flex flex-col h-full overflow-y-auto bg-[#0e0e0e] text-white p-4 space-y-6">
      
      {/* Summary Cards */}
      <div>
        <h2 className="text-sm font-semibold tracking-tight mb-3 text-white">{symbol.replace('.CA', '')} Position Summary</h2>
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl border border-white/[0.08] bg-[#141414]/80 backdrop-blur-xl p-3.5 shadow-xl">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-white/40 truncate">Invested</div>
            <div className="mt-1 text-sm font-bold font-mono text-white truncate">{formatMoney(totalInvested)}</div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#141414]/80 backdrop-blur-xl p-3.5 shadow-xl">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-white/40 truncate">Unrealized P/L</div>
            <div className={`mt-1 text-sm font-bold font-mono truncate ${unrealizedPl >= 0 ? 'text-[#00e676]' : 'text-[#ff4d58]'}`}>
              {formatMoney(unrealizedPl, true)}
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#141414]/80 backdrop-blur-xl p-3.5 shadow-xl">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-white/40 truncate">Realized P/L</div>
            <div className={`mt-1 text-sm font-bold font-mono truncate ${realizedPl >= 0 ? 'text-[#00e676]' : 'text-[#ff4d58]'}`}>
              {formatMoney(realizedPl, true)}
            </div>
          </div>
        </div>
      </div>

      {/* Position Detail Cards */}
      <div>
        <h2 className="text-sm font-semibold tracking-tight mb-3 text-white">Order History</h2>
        {displayOrders.length === 0 ? (
          <div className="text-xs text-white/40 text-center py-8 border border-white/[0.08] rounded-2xl border-dashed bg-[#141414]/40">
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
                <div key={order.id} className="rounded-2xl border border-white/[0.08] bg-[#141414]/80 backdrop-blur-xl p-4 flex flex-col space-y-3 shadow-xl relative overflow-hidden">
                  {/* Left accent strip based on status */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${isOpen ? 'bg-plt-orange' : 'bg-white/10'}`} />
                  
                  <div className="flex justify-between items-start ml-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                          isOpen ? 'bg-white/[0.08] border border-white/[0.12] text-white' : 'bg-white/[0.02] text-white/40'
                        }`}>
                          {isOpen ? 'OPEN' : 'CLOSED'}
                        </span>
                        <span className="text-xs text-white/40 font-mono">
                          {typeof order.entryDate === 'string' ? order.entryDate.split('T')[0] : new Date(order.entryDate).toISOString().split('T')[0]}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-white/60">
                        Qty: <span className="font-mono font-semibold text-white">{order.quantity}</span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className={`text-sm font-bold ${pl >= 0 ? 'text-[#00e676]' : 'text-[#ff4d58]'}`}>
                        {formatMoney(pl, true)}
                      </div>
                      <div className={`text-xs ${pl >= 0 ? 'text-[#00e676]/80' : 'text-[#ff4d58]/80'}`}>
                        {plPct >= 0 ? '+' : ''}{plPct.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 ml-2 pt-2.5 border-t border-white/[0.04] text-xs font-mono">
                    <div>
                      <span className="text-white/40 text-[10px] block font-sans">Entry</span>
                      <span className="text-white">{formatPrice(order.entryPrice)}</span>
                    </div>
                    {isOpen ? (
                      <div>
                        <span className="text-white/40 text-[10px] block font-sans">Current</span>
                        <span className="text-white">{formatPrice(currentPrice)}</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-white/40 text-[10px] block font-sans">Exit</span>
                        <span className="text-white">{order.exitPrice ? formatPrice(order.exitPrice) : '-'}</span>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-white/40 text-[10px] block font-sans">Target</span>
                      <span className="text-[#00e676]">{order.targetPrice ? formatPrice(order.targetPrice) : '-'}</span>
                    </div>
                    <div>
                      <span className="text-white/40 text-[10px] block font-sans">Stop</span>
                      <span className="text-[#ff4d58]">{order.stopPrice ? formatPrice(order.stopPrice) : '-'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
