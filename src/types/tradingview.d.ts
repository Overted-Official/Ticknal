declare module "@mathieuc/tradingview" {
  export type TradingViewPeriod = {
    time: number;
    open: number;
    max: number;
    min: number;
    close: number;
    volume: number;
  };

  export type TradingViewChart = {
    periods: TradingViewPeriod[];
    setMarket(symbol: string, options: Record<string, unknown>): void;
    onUpdate(callback: () => void): void;
    onError(callback: (error: Error) => void): void;
    delete(): void;
  };

  export type TradingViewClient = {
    Session: {
      Chart: new () => TradingViewChart;
    };
    end(): void;
  };

  const TradingView: {
    Client: new () => TradingViewClient;
  };

  export default TradingView;
}
