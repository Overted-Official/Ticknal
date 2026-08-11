import pandas as pd
import numpy as np

def compute_market_context(all_tickers_df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes market-wide features based on the cross-section of all tickers on each day.
    Expects a DataFrame combining all tickers, with columns: ['tickerSymbol', 'date', 'close', ...]
    """
    # Make sure we have a proper date index
    df = all_tickers_df.copy()
    
    # Pre-calculate 20-day SMA for each ticker to compute breadth
    df['sma_20'] = df.groupby('tickerSymbol')['close'].transform(lambda x: x.rolling(20).mean())
    df['above_sma_20'] = (df['close'] > df['sma_20']).astype(int)
    
    # Calculate daily returns for each ticker
    df['daily_return'] = df.groupby('tickerSymbol')['close'].transform(lambda x: x.pct_change())
    
    # Group by date to compute market-wide aggregates
    market_daily = df.groupby('date').agg(
        market_breadth=('above_sma_20', 'mean'), # % of tickers above 20 SMA
        avg_market_return=('daily_return', 'mean')
    ).reset_index()
    
    # Calculate market volatility regime (rolling 20-day std dev of the average market return)
    market_daily['market_volatility_20'] = market_daily['avg_market_return'].rolling(20).std() * np.sqrt(252)
    
    # Calculate market momentum
    market_daily['market_trend_20'] = market_daily['avg_market_return'].rolling(20).mean() * 252
    
    # NEW: EGX-specific regime filters
    # Breadth is bullish if > 50% of tickers are above 20 SMA
    market_daily['breadth_bullish'] = market_daily['market_breadth'] > 0.5
    
    # Volatility regime classification
    # > 30% annualized vol on the index is crisis mode
    market_daily['market_vol_regime'] = 'NORMAL'
    market_daily.loc[market_daily['market_volatility_20'] < 0.15, 'market_vol_regime'] = 'CALM'
    market_daily.loc[market_daily['market_volatility_20'] > 0.30, 'market_vol_regime'] = 'CRISIS'
    
    # Bear market filter (suppress entries if strong downtrend)
    market_daily['bear_market_filter'] = market_daily['market_trend_20'] < -0.10
    
    # Return just the market context columns
    return market_daily[['date', 'market_breadth', 'market_volatility_20', 'market_trend_20', 'breadth_bullish', 'market_vol_regime', 'bear_market_filter']]
