import pandas as pd
import numpy as np
import ta

def analyze_swings():
    print("Loading data...")
    df = pd.read_csv('../consolidated_prices.csv')
    df = df[df['tickerSymbol'] == 'COMI'].copy()
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date').reset_index(drop=True)
    
    print("Computing features...")
    df['rsi_14'] = ta.momentum.RSIIndicator(df['close'], window=14).rsi()
    df['rsi_5'] = ta.momentum.RSIIndicator(df['close'], window=5).rsi()
    
    macd = ta.trend.MACD(df['close'])
    df['macd'] = macd.macd()
    df['macd_signal'] = macd.macd_signal()
    df['macd_hist'] = macd.macd_diff()
    
    df['roc_10'] = ta.momentum.ROCIndicator(df['close'], window=10).roc()
    
    bb = ta.volatility.BollingerBands(df['close'], window=20, window_dev=2)
    df['bb_upper'] = bb.bollinger_hband()
    df['bb_lower'] = bb.bollinger_lband()
    df['bb_width'] = bb.bollinger_wband()
    df['bb_pband'] = bb.bollinger_pband()
    
    df['atr_14'] = ta.volatility.AverageTrueRange(df['high'], df['low'], df['close'], window=14).average_true_range()
    
    df['vol_sma_20'] = df['volume'].rolling(20).mean()
    df['vol_ratio'] = df['volume'] / df['vol_sma_20']
    
    df['true_range'] = np.maximum(df['high'] - df['low'], 
                                  np.maximum(abs(df['high'] - df['close'].shift(1)), 
                                             abs(df['low'] - df['close'].shift(1))))
    df['candle_intensity'] = df['true_range'] / df['close']
    df['madm'] = df['candle_intensity'].rolling(252).median()
    
    df = df.dropna().copy()
    
    # Filter to 2022-2026 to match the user's chart
    df = df[df['date'] >= '2022-01-01'].reset_index(drop=True)
    
    print("Identifying Peaks and Troughs (Swing Highs/Lows)...")
    window = 10 # +/- 10 days
    df['is_peak'] = False
    df['is_trough'] = False
    
    for i in range(window, len(df) - window):
        local_high = df['high'].iloc[i-window:i+window+1].max()
        local_low = df['low'].iloc[i-window:i+window+1].min()
        
        if df['high'].iloc[i] == local_high:
            # ensure it's a significant peak (> 10% from recent low)
            recent_low = df['low'].iloc[max(0, i-20):i].min()
            if (df['high'].iloc[i] - recent_low) / recent_low > 0.10:
                df.at[i, 'is_peak'] = True
                
        if df['low'].iloc[i] == local_low:
            # ensure it's a significant trough (< 10% from recent high)
            recent_high = df['high'].iloc[max(0, i-20):i].max()
            if (recent_high - df['low'].iloc[i]) / recent_high > 0.10:
                df.at[i, 'is_trough'] = True
                
    peaks = df[df['is_peak']]
    troughs = df[df['is_trough']]
    
    print(f"Found {len(peaks)} major peaks (Red Dots) and {len(troughs)} major troughs (Green Dots).")
    
    features_to_analyze = ['rsi_14', 'rsi_5', 'macd_hist', 'roc_10', 'bb_pband', 'bb_width', 'vol_ratio', 'candle_intensity']
    
    print("\n--- AVERAGE METRICS AT PEAKS (Red Dots) ---")
    for f in features_to_analyze:
        print(f"{f}: {peaks[f].mean():.3f} (min: {peaks[f].min():.3f}, max: {peaks[f].max():.3f})")
        
    print("\n--- AVERAGE METRICS AT TROUGHS (Green Dots) ---")
    for f in features_to_analyze:
        print(f"{f}: {troughs[f].mean():.3f} (min: {troughs[f].min():.3f}, max: {troughs[f].max():.3f})")

    # Let's also look at the 2 days BEFORE the peak/trough to see if there's a leading indicator
    df['vol_ratio_shift2'] = df['vol_ratio'].shift(2)
    df['rsi_5_shift2'] = df['rsi_5'].shift(2)
    
    peaks = df[df['is_peak']]
    troughs = df[df['is_trough']]
    
    print("\n--- 2 DAYS BEFORE PEAK ---")
    print(f"Volume Ratio: {peaks['vol_ratio_shift2'].mean():.3f}")
    print(f"RSI 5: {peaks['rsi_5_shift2'].mean():.3f}")
    
    print("\n--- 2 DAYS BEFORE TROUGH ---")
    print(f"Volume Ratio: {troughs['vol_ratio_shift2'].mean():.3f}")
    print(f"RSI 5: {troughs['rsi_5_shift2'].mean():.3f}")

if __name__ == "__main__":
    analyze_swings()
