import pandas as pd
import numpy as np
import pandas_ta as ta
import numba as nb

@nb.njit
def calc_weighted_simple_average(src, length, weight):
    """Numba-accelerated weighted moving average calculation for banker score."""
    n = len(src)
    output = np.full(n, np.nan)
    sum_float = np.full(n, np.nan)
    moving_average = np.full(n, np.nan)
    
    for i in range(n):
        if np.isnan(src[i]):
            continue
            
        prev_sum = sum_float[i-1] if i > 0 and not np.isnan(sum_float[i-1]) else 0.0
        old_val = src[i-length] if i >= length and not np.isnan(src[i-length]) else 0.0
        
        sum_float[i] = prev_sum - old_val + src[i]
        
        if i >= length - 1:
            moving_average[i] = sum_float[i] / length
        else:
            moving_average[i] = np.nan
            
        prev_output = output[i-1] if i > 0 and not np.isnan(output[i-1]) else np.nan
        
        if np.isnan(prev_output):
            if not np.isnan(moving_average[i]):
                output[i] = moving_average[i]
        else:
            output[i] = (src[i] * weight + prev_output * (length - weight)) / length
            
    return output

def true_range(df):
    prev_close = df['close'].shift(1)
    tr1 = df['high'] - df['low']
    tr2 = (df['high'] - prev_close).abs()
    tr3 = (df['low'] - prev_close).abs()
    return pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)

def compute_master_index(df: pd.DataFrame, params: dict) -> pd.DataFrame:
    """
    Computes sub-scores and blends them into a Master Index.
    Uses dynamic parameters config.
    """
    df = df.copy()
    df = df.sort_values(by='date').reset_index(drop=True)
    
    # 1. Price Position (np_score)
    np_high = df['close'].rolling(14).max()
    np_low = df['close'].rolling(14).min()
    df['np_score'] = np.where(np_high != np_low, ((df['close'] - np_low) / (np_high - np_low)) * 100, 50)
    
    # 2. RSI
    df['rsi_score'] = ta.rsi(df['close'], length=14)
    
    # 3. Banker Score (Fund Flow)
    stoch_low = df['low'].rolling(27).min()
    stoch_high = df['high'].rolling(27).max()
    stoch_k = np.where(stoch_high != stoch_low, ((df['close'] - stoch_low) / (stoch_high - stoch_low)) * 100, 50)
    
    out1 = calc_weighted_simple_average(stoch_k, 5, 1.0)
    out2 = calc_weighted_simple_average(out1, 3, 1.0)
    fund_flow = (3 * out1 - 2 * out2 - 50) * 1.032 + 50
    df['banker_score'] = pd.Series(fund_flow).clip(0, 100)
    
    # 4. Bollinger Bands
    bb = ta.bbands(df['close'], length=20, std=2.0)
    if bb is not None:
        df['bb_lower'] = bb.iloc[:, 0]
        df['bb_upper'] = bb.iloc[:, 2]
        bb_diff = df['bb_upper'] - df['bb_lower']
        df['bb_score'] = np.where(bb_diff != 0, ((df['close'] - df['bb_lower']) / bb_diff) * 100, 50).clip(0, 100)
    else:
        df['bb_score'] = 50
    
    # 5. SuperTrend
    sti = ta.supertrend(df['high'], df['low'], df['close'], length=10, multiplier=3.0)
    if sti is not None:
        st_val = sti['SUPERT_10_3.0']
        df['st_dir'] = sti['SUPERTd_10_3.0']
        df['atr_10'] = ta.atr(df['high'], df['low'], df['close'], length=10)
        st_dist = df['close'] - st_val
        # Avoid division by zero
        df['st_score'] = np.where(df['atr_10'] > 0, (50 + ((st_dist / (df['atr_10'] * 3.0)) * 50)), 50).clip(0, 100)
    else:
        df['st_score'] = 50
        df['st_dir'] = 1
    
    # 6. ADX
    adx_df = ta.adx(df['high'], df['low'], df['close'], length=14)
    if adx_df is not None and not adx_df.empty:
        di_plus = adx_df['DMP_14']
        di_minus = adx_df['DMN_14']
        sum_di = di_plus + di_minus
        df['adx_score'] = np.where(sum_di != 0, 50 + ((di_plus - di_minus) / sum_di * 50), 50).clip(0, 100)
    else:
        df['adx_score'] = 50
        
    # 7. MA Score
    ma_fast = df['close'].rolling(50).mean()
    ma_slow = df['close'].rolling(200).mean()
    ma_diff = ma_fast - ma_slow
    ma_diff_high = ma_diff.rolling(14).max()
    ma_diff_low = ma_diff.rolling(14).min()
    diff_range = ma_diff_high - ma_diff_low
    df['ma_score'] = np.where(diff_range != 0, ((ma_diff - ma_diff_low) / diff_range) * 100, 50)
    
    # 8. Slope Score
    df['atr_14'] = ta.atr(df['high'], df['low'], df['close'], length=14)
    price_change = df['close'] - df['close'].shift(14)
    raw_slope = np.where(df['atr_14'] > 0, price_change / (df['atr_14'] * 14), 0)
    angle = np.degrees(np.arctan(raw_slope))
    df['slope_score'] = (((angle + 90) / 180) * 100).clip(0, 100)
    
    # Weighted Blend
    w_price = params['w_price']
    w_rsi = params['w_rsi']
    w_banker = params['w_banker']
    w_bb = params['w_bb']
    w_st = params['w_st']
    w_adx = params['w_adx']
    w_ma = params['w_ma']
    w_slope = params['w_slope']
    total_w = w_price + w_rsi + w_banker + w_bb + w_st + w_adx + w_ma + w_slope
    
    df['master_index_raw'] = (
        (df['np_score'] * w_price) + 
        (df['rsi_score'] * w_rsi) + 
        (df['banker_score'] * w_banker) + 
        (df['bb_score'] * w_bb) + 
        (df['st_score'] * w_st) + 
        (df['adx_score'] * w_adx) + 
        (df['ma_score'] * w_ma) + 
        (df['slope_score'] * w_slope)
    ) / total_w
    
    # Quantize to Fibonacci Steps (16.18)
    df['master_index'] = np.round(df['master_index_raw'] / 16.18) * 16.18
    
    # Market Dynamics Multiplier (MDM) needed for exits
    df['tr'] = true_range(df)
    df['candle_intensity'] = (df['tr'] / df['close']) * 100.0
    df['mdm'] = df['candle_intensity'].rolling(252).median()
    
    return df
