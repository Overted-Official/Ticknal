import pandas as pd
import numpy as np

def classify_tickers(price_df: pd.DataFrame) -> pd.DataFrame:
    """
    Classify EGX tickers by liquidity and volatility using recent data (last 252 days).
    Returns a DataFrame with classification flags per ticker.
    """
    classifications = []
    
    for ticker, group in price_df.groupby('tickerSymbol'):
        # Ensure sorted
        group = group.sort_values('date')
        # Use last 252 trading days for classification
        recent = group.tail(252)
        
        if len(recent) < 60:
            # Not enough data, default to illiquid/high vol
            classifications.append({
                'tickerSymbol': ticker,
                'liquidity_class': 'ILLIQUID',
                'vol_regime': 'HIGH_VOL'
            })
            continue
        
        # 1. Liquidity Class
        # Average Daily Value Traded (ADVT) over the last 60 days
        advt = (recent['volume'].tail(60) * recent['close'].tail(60)).median()
        
        if advt > 10_000_000:
            liq_class = 'LIQUID'
        elif advt > 1_000_000:
            liq_class = 'SEMI_LIQUID'
        else:
            liq_class = 'ILLIQUID'
            
        # 2. Volatility Regime
        # Median Daily Movement (MDM) using true range
        prev_close = recent['close'].shift(1)
        tr1 = recent['high'] - recent['low']
        tr2 = (recent['high'] - prev_close).abs()
        tr3 = (recent['low'] - prev_close).abs()
        true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        
        candle_intensity = (true_range / recent['close']) * 100.0
        mdm = candle_intensity.median()
        
        if pd.isna(mdm) or mdm > 5.0:
            vol_regime = 'HIGH_VOL'
        elif mdm > 2.5:
            vol_regime = 'NORMAL_VOL'
        else:
            vol_regime = 'LOW_VOL'
            
        classifications.append({
            'tickerSymbol': ticker,
            'liquidity_class': liq_class,
            'vol_regime': vol_regime,
            'mdm_value': mdm,
            'advt_value': advt
        })
        
    return pd.DataFrame(classifications)
