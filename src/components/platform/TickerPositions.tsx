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
    <div className="flex flex-col h-full overflow-y-auto bg-tv-base text-tv-text p-4 space-y-6">
      
      {/* Summary Cards */}
      <div>
        <h2 className="text-sm font-weight-medium mb-3">{symbol} Position Summary</h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-tv-lg border border-tv-border bg-tv-surface p-3">
            <div className="text-[10px] uppercase text-tv-muted truncate">Invested</div>
            <div className="mt-1 text-sm font-weight-medium text-tv-text truncate">{formatMoney(totalInvested)}</div>
          </div>
          <div className="rounded-tv-lg border border-tv-border bg-tv-surface p-3">
            <div className="text-[10px] uppercase text-tv-muted truncate">Unrealized P/L</div>
            <div className={`mt-1 text-sm font-weight-medium truncate ${unrealizedPl >= 0 ? 'text-tv-up' : 'text-tv-down'}`}>
              {formatMoney(unrealizedPl, true)}
            </div>
          </div>
          <div className="rounded-tv-lg border border-tv-border bg-tv-surface p-3">
            <div className="text-[10px] uppercase text-tv-muted truncate">Realized P/L</div>
            <div className={`mt-1 text-sm font-weight-medium truncate ${realizedPl >= 0 ? 'text-tv-up' : 'text-tv-down'}`}>
              {formatMoney(realizedPl, true)}
            </div>
          </div>
        </div>
      </div>

      {/* Position Detail Cards */}
      <div>
        <h2 className="text-sm font-weight-medium mb-3">Order History</h2>
        {displayOrders.length === 0 ? (
          <div className="text-sm text-tv-muted text-center py-6 border border-tv-border rounded-tv-lg border-dashed">
            No positions found for {symbol}
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
                <div key={order.id} className="rounded-tv-lg border border-tv-border bg-tv-surface p-4 flex flex-col space-y-3 relative overflow-hidden">
                  {/* Left accent strip based on status/side */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${isOpen ? 'bg-tv-accent' : 'bg-tv-border-highlight'}`} />
                  
                  <div className="flex justify-between items-start ml-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[11px] px-1.5 py-0.5 rounded-sm font-weight-bold ${isOpen ? 'bg-tv-up/20 text-tv-up' : 'bg-tv-border text-tv-muted'}`}>
                          {isOpen ? 'OPEN' : 'CLOSED'}
                        </span>
                        <span className="text-xs text-tv-muted">
                          {typeof order.entryDate === 'string' ? order.entryDate.split('T')[0] : new Date(order.entryDate).toISOString().split('T')[0]}
                        </span>
                      </div>
                      <div className="mt-2 text-sm">
                        Qty: <span className="font-medium text-tv-text">{order.quantity}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-weight-bold ${pl >= 0 ? 'text-tv-up' : 'text-tv-down'}`}>
                        {formatMoney(pl, true)}
                      </div>
                      <div className={`text-xs ${pl >= 0 ? 'text-tv-up/80' : 'text-tv-down/80'}`}>
                        {plPct >= 0 ? '+' : ''}{plPct.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 ml-2 pt-2 border-t border-tv-border/50 text-xs">
                    <div>
                      <span className="text-tv-muted">Entry: </span>
                      <span className="text-tv-text">{formatPrice(order.entryPrice)}</span>
                    </div>
                    {isOpen ? (
                      <div>
                        <span className="text-tv-muted">Current: </span>
                        <span className="text-tv-text">{formatPrice(currentPrice)}</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-tv-muted">Exit: </span>
                        <span className="text-tv-text">{order.exitPrice ? formatPrice(order.exitPrice) : '-'}</span>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-tv-muted">Target: </span>
                      <span className="text-tv-up">{order.targetPrice ? formatPrice(order.targetPrice) : '-'}</span>
                    </div>
                    <div>
                      <span className="text-tv-muted">Stop: </span>
                      <span className="text-tv-down">{order.stopPrice ? formatPrice(order.stopPrice) : '-'}</span>
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
