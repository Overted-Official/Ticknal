import pandas as pd
from .indicators import compute_indicators
from .market_context import compute_market_context
from tqdm import tqdm

def build_feature_matrix(price_df: pd.DataFrame) -> pd.DataFrame:
    """
    Takes a combined DataFrame of all tickers (['tickerSymbol', 'date', 'open', 'high', 'low', 'close', 'volume']).
    Returns a unified feature matrix with all technical and market-wide features computed.
    """
    print("Computing market-wide context features...")
    market_df = compute_market_context(price_df)
    
    print("Computing technical indicators for each ticker...")
    ticker_dfs = []
    
    # Group by ticker and compute indicators
    grouped = price_df.groupby('tickerSymbol')
    for ticker, group in tqdm(grouped, total=len(grouped)):
        if len(group) < 30: # Skip tickers with too little data
            continue
            
        feat_df = compute_indicators(group)
        
        # Add stock characteristics (using rolling window to prevent leakage)
        # Average volume bucket
        feat_df['log_avg_vol_60'] = np.log1p(feat_df['volume'].rolling(60).mean())
        
        ticker_dfs.append(feat_df)
        
    print("Merging features...")
    combined_features = pd.concat(ticker_dfs, ignore_index=True)
    
    # Merge market context
    final_features = pd.merge(combined_features, market_df, on='date', how='left')
    
    # Fill NaN values (forward fill first, then backward fill for the start of the series)
    # We group by ticker to avoid leaking data between tickers
    cols_to_fill = final_features.columns.difference(['tickerSymbol', 'date'])
    final_features[cols_to_fill] = final_features.groupby('tickerSymbol')[cols_to_fill].ffill()
    final_features[cols_to_fill] = final_features.groupby('tickerSymbol')[cols_to_fill].bfill()
    
    return final_features

import numpy as np # need to import here if missed above
