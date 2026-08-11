import pandas as pd
import numpy as np
import pandas_ta as ta
import numba as nb
import itertools
import sys
import os

@nb.njit
def calc_weighted_simple_average(src, length, weight):
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

def optimize_ticker(ticker, df_full, start_date):
    df = df_full[df_full['ticker_symbol'] == ticker].copy()
    if df.empty:
        return None
        
    df = df.sort_values('date').reset_index(drop=True)
    
    if len(df) < 260:
        return None
        
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
    if bb is not None:
        df['bb_lower'] = bb.iloc[:, 0]
        df['bb_upper'] = bb.iloc[:, 2]
        bb_diff = df['bb_upper'] - df['bb_lower']
        df['bb_score'] = np.where(bb_diff != 0, ((df['close'] - df['bb_lower']) / bb_diff) * 100, 50).clip(0, 100)
    else:
        df['bb_score'] = 50
        
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
    
    df = df.dropna(subset=['master_index', 'mdm', 'atr_14']).copy()
    test_df = df[df['date'] >= pd.to_datetime(start_date)].copy()
    
    if test_df.empty:
        return None
        
    bh_roi = (test_df.iloc[-1]['close'] / test_df.iloc[0]['close'] - 1) * 100
    
    entry_levels = [
        [14.6],
        [23.6],
        [14.6, 23.6],
        [23.6, 38.2],
        [14.6, 23.6, 38.2],
        [14.6, 23.6, 38.2, 50.0]
    ]
    aym_mults = [3.0, 3.5, 4.0, 4.5, 5.0, 6.0]
    aym_limits = [61.8, 78.6, 88.6, 100.0]
    atr_mults = [2.5, 3.0, 3.5, 4.0]
    sl_mults = [4.0, 5.0, 6.0, 7.0]
    
    index_arr = test_df['master_index'].values
    close_arr = test_df['close'].values
    high_arr = test_df['high'].values
    low_arr = test_df['low'].values
    mdm_arr = test_df['mdm'].values
    atr_arr = test_df['atr_14'].values
    st_dir_arr = test_df['st_dir'].values
    n = len(test_df)
    
    best_roi = bh_roi # MUST BEAT B&H
    best_params = None
    best_avg_bars = 0
    best_trades = 0
    
    combinations = list(itertools.product(entry_levels, aym_mults, aym_limits, atr_mults, sl_mults))
    
    for combo in combinations:
        levels, aym, aym_lim, atr_m, sl = combo
        
        capital = 10000.0
        shares = 0
        buy_price = 0.0
        current_max = 0.0
        trades_count = 0
        total_bars_in_trade = 0
        bars_since_buy = 0
        
        for i in range(1, n):
            idx = index_arr[i]
            idx_prev = index_arr[i-1]
            price = close_arr[i]
            p_high = high_arr[i]
            mdm = mdm_arr[i]
            atr = atr_arr[i]
            st_dir = st_dir_arr[i]
            
            if shares == 0:
                crossover = any((idx > lvl) and (idx_prev <= lvl) for lvl in levels)
                if crossover:
                    cost = price
                    shares = int(capital // cost)
                    if shares > 0:
                        capital -= (shares * cost)
                        buy_price = price
                        current_max = p_high
                        bars_since_buy = 0
            else:
                bars_since_buy += 1
                current_max = max(current_max, p_high)
                
                target_p = buy_price * (1 + (mdm * aym / 100.0))
                trail_level = current_max - (atr * atr_m)
                sl_level = buy_price * (1 - (mdm * sl / 100.0))
                
                hit_tp = (price >= target_p) and (idx < aym_lim)
                hit_sl = price <= sl_level
                hit_trail = (price <= trail_level) and (price > buy_price)
                hit_index = (idx < 50.0) and (idx_prev >= 50.0) and (st_dir == -1) and (price > buy_price)
                
                if hit_tp or hit_sl or hit_trail or hit_index:
                    revenue = (shares * price)
                    capital += revenue
                    shares = 0
                    trades_count += 1
                    total_bars_in_trade += bars_since_buy
                    
        if shares > 0:
            capital += shares * close_arr[-1]
            trades_count += 1
            total_bars_in_trade += bars_since_buy
            
        roi = ((capital - 10000) / 10000) * 100
        avg_bars = total_bars_in_trade / trades_count if trades_count > 0 else 0
        
        if avg_bars <= 64:
            if roi > best_roi:
                best_roi = roi
                best_params = combo
                best_avg_bars = avg_bars
                best_trades = trades_count
                
    return {
        'ticker': ticker,
        'bh_roi': bh_roi,
        'best_roi': best_roi,
        'best_params': best_params,
        'trades': best_trades,
        'avg_bars': best_avg_bars
    }

def main():
    tickers = ["ACAP", "ADIB", "AFMC", "ARCC", "BTFH", "CANA", "COMI", "EALR", "EFIC", "EFID", "EGAL", "ETEL", "GBCO", "HDBK", "ICFC", "IFAP", "IRON", "JUFO", "MBEG", "MBSC", "MCQE", "MPCI", "NIPH", "OIH", "OLFI", "ORHD", "ORWE", "PHDC", "POUL", "SCEM", "SCFM", "SWDY", "WKOL"]
    start_date = '2021-01-01'
    
    print("Loading Data...")
    data_path = '../consolidated_prices_fixed.csv'
    df_full = pd.read_csv(data_path, low_memory=False)
    df_full['date'] = pd.to_datetime(df_full['date'], errors='coerce')
    for col in ['open', 'high', 'low', 'close', 'volume']:
        if col in df_full.columns:
            df_full[col] = pd.to_numeric(df_full[col], errors='coerce')
            
    results = []
    
    for t in tickers:
        print(f"Optimizing {t}...")
        res = optimize_ticker(t, df_full, start_date)
        if res:
            if res['best_params'] is None:
                print(f"  [{t}] Could not beat B&H ({res['bh_roi']:.2f}%) with <= 64 avg bars.")
                # We will still output a default just in case, but let's just log it.
            else:
                p = res['best_params']
                print(f"  [{t}] Found optimal! ROI: {res['best_roi']:.2f}% (B&H: {res['bh_roi']:.2f}%) - Params: {p}")
                levels, aym, aym_lim, atr_m, sl = p
                
                results.append({
                    'ticker': t,
                    'L_14_6': 14.6 in levels,
                    'L_23_6': 23.6 in levels,
                    'L_38_2': 38.2 in levels,
                    'L_50_0': 50.0 in levels,
                    'aym': aym,
                    'aym_lim': aym_lim,
                    'atr_m': atr_m,
                    'sl': sl,
                    'roi': res['best_roi'],
                    'bh_roi': res['bh_roi']
                })
        else:
            print(f"  [{t}] Not enough data.")
            
    df_res = pd.DataFrame(results)
    out_path = '../optimized_parameters_v10.csv'
    df_res.to_csv(out_path, index=False)
    print(f"Saved optimized parameters to {out_path}")

if __name__ == '__main__':
    main()
