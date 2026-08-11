import sys
import argparse
import pandas as pd
import numpy as np
import pandas_ta as ta
import numba as nb
import json
import os

@nb.njit
def calc_weighted_simple_average(src, length, weight):
    n = len(src)
    output = np.full(n, np.nan)
    sum_float = np.full(n, np.nan)
    moving_average = np.full(n, np.nan)
    for i in range(n):
        if np.isnan(src[i]): continue
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

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ticker', type=str, required=True)
    args = parser.parse_args()
    
    ticker_full = args.ticker
    ticker = ticker_full.replace('.CA', '')
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(script_dir))
    
    params_path = os.path.join(project_root, 'optimized_parameters_v10.csv')
    data_path = os.path.join(project_root, 'consolidated_prices_fixed.csv')
    
    if not os.path.exists(params_path) or not os.path.exists(data_path):
        print(json.dumps({"signals": []}))
        return
        
    df_params = pd.read_csv(params_path)
    row = df_params[df_params['ticker'] == ticker]
    
    if row.empty:
        print(json.dumps({"signals": []}))
        return
        
    p = row.iloc[0]
    
    levels = []
    if bool(p['L_14_6']): levels.append(14.6)
    if bool(p['L_23_6']): levels.append(23.6)
    if bool(p['L_38_2']): levels.append(38.2)
    if bool(p['L_50_0']): levels.append(50.0)
    
    aym = float(p['aym'])
    aym_lim = float(p['aym_lim'])
    atr_m = float(p['atr_m'])
    sl = float(p['sl'])
    
    df_full = pd.read_csv(data_path, low_memory=False)
    df_full['date'] = pd.to_datetime(df_full['date'], errors='coerce')
    for col in ['open', 'high', 'low', 'close', 'volume']:
        df_full[col] = pd.to_numeric(df_full[col], errors='coerce')
        
    df = df_full[df_full['ticker_symbol'] == ticker].copy()
    df = df.sort_values('date').reset_index(drop=True)
    
    if len(df) < 260:
        print(json.dumps({"signals": []}))
        return
        
    np_high = df['close'].rolling(14).max()
    np_low = df['close'].rolling(14).min()
    df['np_score'] = np.where(np_high != np_low, ((df['close'] - np_low) / (np_high - np_low)) * 100, 50)
    df['rsi_score'] = ta.rsi(df['close'], length=14)
    stoch_low = df['low'].rolling(27).min()
    stoch_high = df['high'].rolling(27).max()
    stoch_k = np.where(stoch_high != stoch_low, ((df['close'] - stoch_low) / (stoch_high - stoch_low)) * 100, 50)
    out1 = calc_weighted_simple_average(stoch_k, 5, 1.0)
    out2 = calc_weighted_simple_average(out1, 3, 1.0)
    fund_flow = (3 * out1 - 2 * out2 - 50) * 1.032 + 50
    df['banker_score'] = pd.Series(fund_flow).clip(0, 100)
    bb = ta.bbands(df['close'], length=20, std=2.0)
    df['bb_lower'] = bb.iloc[:, 0]
    df['bb_upper'] = bb.iloc[:, 2]
    bb_diff = df['bb_upper'] - df['bb_lower']
    df['bb_score'] = np.where(bb_diff != 0, ((df['close'] - df['bb_lower']) / bb_diff) * 100, 50).clip(0, 100)
    sti = ta.supertrend(df['high'], df['low'], df['close'], length=10, multiplier=3.0)
    st_val = sti['SUPERT_10_3.0']
    df['st_dir'] = sti['SUPERTd_10_3.0']
    df['atr_10'] = ta.atr(df['high'], df['low'], df['close'], length=10)
    st_dist = df['close'] - st_val
    df['st_score'] = np.where(df['atr_10'] > 0, (50 + ((st_dist / (df['atr_10'] * 3.0)) * 50)), 50).clip(0, 100)
    adx_df = ta.adx(df['high'], df['low'], df['close'], length=14)
    if adx_df is not None and not adx_df.empty:
        di_plus = adx_df['DMP_14']
        di_minus = adx_df['DMN_14']
        sum_di = di_plus + di_minus
        df['adx_score'] = np.where(sum_di != 0, 50 + ((di_plus - di_minus) / sum_di * 50), 50).clip(0, 100)
    else:
        df['adx_score'] = 50
    ma_fast = df['close'].rolling(50).mean()
    ma_slow = df['close'].rolling(200).mean()
    ma_diff = ma_fast - ma_slow
    ma_diff_high = ma_diff.rolling(14).max()
    ma_diff_low = ma_diff.rolling(14).min()
    diff_range = ma_diff_high - ma_diff_low
    df['ma_score'] = np.where(diff_range != 0, ((ma_diff - ma_diff_low) / diff_range) * 100, 50)
    df['atr_14'] = ta.atr(df['high'], df['low'], df['close'], length=14)
    price_change = df['close'] - df['close'].shift(14)
    raw_slope = np.where(df['atr_14'] > 0, price_change / (df['atr_14'] * 14), 0)
    angle = np.degrees(np.arctan(raw_slope))
    df['slope_score'] = (((angle + 90) / 180) * 100).clip(0, 100)
    w_price, w_rsi, w_banker, w_bb, w_st, w_adx, w_ma, w_slope = 21.0, 10.0, 5.0, 4.0, 44.0, 10.0, 4.0, 1.0
    total_w = sum([w_price, w_rsi, w_banker, w_bb, w_st, w_adx, w_ma, w_slope])
    df['master_index_raw'] = (
        (df['np_score'] * w_price) + (df['rsi_score'] * w_rsi) + 
        (df['banker_score'] * w_banker) + (df['bb_score'] * w_bb) + 
        (df['st_score'] * w_st) + (df['adx_score'] * w_adx) + 
        (df['ma_score'] * w_ma) + (df['slope_score'] * w_slope)
    ) / total_w
    df['master_index'] = np.round(df['master_index_raw'] / 16.18) * 16.18
    df['tr'] = true_range(df)
    df['candle_intensity'] = (df['tr'] / df['close']) * 100.0
    df['mdm'] = df['candle_intensity'].rolling(252).median()
    
    # Filter to from 2021-01-01 (as tested in optimization) to properly align signals
    df = df[df['date'] >= pd.to_datetime('2021-01-01')].copy()
    
    df = df.dropna(subset=['master_index', 'mdm', 'atr_14']).copy()
    df = df.reset_index(drop=True)
    
    signals = []
    
    index_arr = df['master_index'].values
    close_arr = df['close'].values
    high_arr = df['high'].values
    low_arr = df['low'].values
    mdm_arr = df['mdm'].values
    atr_arr = df['atr_14'].values
    st_dir_arr = df['st_dir'].values
    date_arr = df['date'].dt.strftime('%Y-%m-%d').values
    n = len(df)
    
    shares = 0
    buy_price = 0.0
    current_max = 0.0
    
    for i in range(1, n):
        idx = index_arr[i]
        idx_prev = index_arr[i-1]
        price = close_arr[i]
        p_high = high_arr[i]
        p_low = low_arr[i]
        mdm = mdm_arr[i]
        atr = atr_arr[i]
        st_dir = st_dir_arr[i]
        current_date = date_arr[i]
        
        if shares == 0:
            crossover = False
            for lvl in levels:
                if idx > lvl and idx_prev <= lvl:
                    crossover = True
                    break
            if crossover:
                shares = 1
                buy_price = price
                current_max = p_high
                signals.append({
                    "date": current_date,
                    "signal": "BUY",
                    "confidence": 1.0,
                    "price": price
                })
        else:
            current_max = max(current_max, p_high)
            
            hit_tp = False
            hit_sl = False
            hit_trail = False
            hit_smart = False
            
            if aym is not None:
                target_p = buy_price * (1 + (mdm * aym / 100.0))
                hit_tp = (price >= target_p) and (idx < aym_lim)
                
            if sl is not None:
                sl_level = buy_price * (1 - (mdm * sl / 100.0))
                hit_sl = price <= sl_level
                
            if atr_m is not None:
                trail_level = current_max - (atr * atr_m)
                hit_trail = (price <= trail_level) and (price > buy_price)
                
            hit_smart = (idx < 50.0) and (idx_prev >= 50.0) and (st_dir == -1) and (price > buy_price)
            
            if hit_tp or hit_sl or hit_trail or hit_smart:
                shares = 0
                
                if hit_tp:
                    exit_type = "SELL_TP"
                    conf = 1.0
                elif hit_smart:
                    exit_type = "SELL_SMART"
                    conf = 0.9
                elif hit_trail:
                    exit_type = "SELL_TRAIL"
                    conf = 0.5
                else:
                    exit_type = "SELL_SL"
                    conf = 0.5
                    
                signals.append({
                    "date": current_date,
                    "signal": exit_type,
                    "confidence": conf,
                    "price": price
                })

    print(json.dumps({"signals": signals}))

if __name__ == '__main__':
    main()
