import pandas as pd
import numpy as np

def compute_labels(df: pd.DataFrame, horizons: list[int]) -> pd.DataFrame:
    """
    Computes regression labels (exact future percentage returns) for multiple horizons for a single ticker.
    Expects DataFrame to be sorted by date.
    """
    df = df.copy()
    label_cols = []
    
    for h in horizons:
        # Exact forward return over the next h days
        label_col = f'label_{h}d'
        df[label_col] = (df['close'].shift(-h) / df['close']) - 1
        
        # Invalidate labels at the very end of the dataset where we don't have future data
        df.loc[df.index[-h:], label_col] = np.nan
        label_cols.append(label_col)
        
    return df[['date', 'tickerSymbol'] + label_cols]

def apply_labels_to_all(price_df: pd.DataFrame, horizons: list[int]) -> pd.DataFrame:
    """Applies labeling to all tickers in the dataset."""
    print("Computing multi-horizon labels...")
    
    # Sort just in case
    price_df = price_df.sort_values(['tickerSymbol', 'date'])
    
    labeled_dfs = []
    for ticker, group in price_df.groupby('tickerSymbol'):
        labeled_dfs.append(compute_labels(group, horizons))
        
    return pd.concat(labeled_dfs, ignore_index=True)
