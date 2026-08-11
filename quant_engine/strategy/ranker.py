import pandas as pd
import numpy as np

def rank_signals(daily_signals: pd.DataFrame, max_signals: int = 5) -> pd.DataFrame:
    """
    Ranks multiple BUY signals generated on the same day.
    daily_signals should contain: tickerSymbol, signal, master_index, mdm, volume, avg_vol_20
    """
    if daily_signals.empty:
        return daily_signals
        
    buys = daily_signals[daily_signals['signal'] == 'BUY'].copy()
    if buys.empty:
        return buys
        
    # We will score them based on:
    # 1. Master Index value (higher is better)
    # 2. Volume confirmation (current vol vs avg vol)
    
    if 'avg_vol_20' in buys.columns and 'volume' in buys.columns:
        buys['vol_confirmation'] = buys['volume'] / (buys['avg_vol_20'] + 1e-9)
    else:
        buys['vol_confirmation'] = 1.0
        
    # We can also add a sector penalty here if we have sector data
    
    # Simple score: 0.7 * normalized index + 0.3 * normalized vol
    idx_norm = buys['master_index'] / buys['master_index'].max() if buys['master_index'].max() > 0 else 0
    vol_norm = buys['vol_confirmation'] / buys['vol_confirmation'].max() if buys['vol_confirmation'].max() > 0 else 0
    
    buys['rank_score'] = (0.7 * idx_norm) + (0.3 * vol_norm)
    
    # Sort and take top N
    ranked = buys.sort_values(by='rank_score', ascending=False)
    
    return ranked.head(max_signals)
