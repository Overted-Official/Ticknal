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
    <div className="flex flex-col h-full overflow-y-auto bg-plt-base text-plt-text p-4 space-y-6">
      
      {/* Summary Cards */}
      <div>
        <h2 className="text-sm font-weight-medium mb-3 text-plt-text">{symbol} Position Summary</h2>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-tv-lg border border-plt-border bg-plt-surface p-3">
            <div className="text-[10px] uppercase text-plt-muted truncate">Invested</div>
            <div className="mt-1 text-sm font-weight-medium text-plt-text truncate">{formatMoney(totalInvested)}</div>
          </div>
          <div className="rounded-tv-lg border border-plt-border bg-plt-surface p-3">
            <div className="text-[10px] uppercase text-plt-muted truncate">Unrealized P/L</div>
            <div className={`mt-1 text-sm font-weight-medium truncate ${unrealizedPl >= 0 ? 'text-plt-green' : 'text-plt-red'}`}>
              {formatMoney(unrealizedPl, true)}
            </div>
          </div>
          <div className="rounded-tv-lg border border-plt-border bg-plt-surface p-3">
            <div className="text-[10px] uppercase text-plt-muted truncate">Realized P/L</div>
            <div className={`mt-1 text-sm font-weight-medium truncate ${realizedPl >= 0 ? 'text-plt-green' : 'text-plt-red'}`}>
              {formatMoney(realizedPl, true)}
            </div>
          </div>
        </div>
      </div>

      {/* Position Detail Cards */}
      <div>
        <h2 className="text-sm font-weight-medium mb-3 text-plt-text">Order History</h2>
        {displayOrders.length === 0 ? (
          <div className="text-sm text-plt-muted text-center py-6 border border-plt-border rounded-tv-lg border-dashed bg-plt-surface">
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
                <div key={order.id} className="rounded-tv-lg border border-plt-border bg-plt-surface p-4 flex flex-col space-y-3 relative overflow-hidden">
                  {/* Left accent strip based on status/side */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${isOpen ? 'bg-plt-red' : 'bg-plt-border'}`} />
                  
                  <div className="flex justify-between items-start ml-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[11px] px-1.5 py-0.5 rounded-sm font-weight-bold ${isOpen ? 'bg-plt-green/20 text-plt-green' : 'bg-plt-card border border-plt-border text-plt-muted'}`}>
                          {isOpen ? 'OPEN' : 'CLOSED'}
                        </span>
                        <span className="text-xs text-plt-muted">
                          {typeof order.entryDate === 'string' ? order.entryDate.split('T')[0] : new Date(order.entryDate).toISOString().split('T')[0]}
                        </span>
                      </div>
                      <div className="mt-2 text-sm">
                        Qty: <span className="font-medium text-plt-text">{order.quantity}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-weight-bold ${pl >= 0 ? 'text-plt-green' : 'text-plt-red'}`}>
                        {formatMoney(pl, true)}
                      </div>
                      <div className={`text-xs ${pl >= 0 ? 'text-plt-green/80' : 'text-plt-red/80'}`}>
                        {plPct >= 0 ? '+' : ''}{plPct.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 ml-2 pt-2 border-t border-plt-border/50 text-xs">
                    <div>
                      <span className="text-plt-muted">Entry: </span>
                      <span className="text-plt-text">{formatPrice(order.entryPrice)}</span>
                    </div>
                    {isOpen ? (
                      <div>
                        <span className="text-plt-muted">Current: </span>
                        <span className="text-plt-text">{formatPrice(currentPrice)}</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-plt-muted">Exit: </span>
                        <span className="text-plt-text">{order.exitPrice ? formatPrice(order.exitPrice) : '-'}</span>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-plt-muted">Target: </span>
                      <span className="text-plt-green">{order.targetPrice ? formatPrice(order.targetPrice) : '-'}</span>
                    </div>
                    <div>
                      <span className="text-plt-muted">Stop: </span>
                      <span className="text-plt-red">{order.stopPrice ? formatPrice(order.stopPrice) : '-'}</span>
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
