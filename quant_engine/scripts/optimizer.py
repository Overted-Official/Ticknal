import pandas as pd
import numpy as np
import pandas_ta as ta
import numba as nb
import sys
import itertools
from concurrent.futures import ProcessPoolExecutor
import multiprocessing
import os
import time

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

def prepare_data(ticker):
    data_path = '../../consolidated_prices.csv'
    if not os.path.exists(data_path):
        print(f"File not found: {data_path}")
        return None
        
    df_full = pd.read_csv(data_path, low_memory=False)
    df_full['date'] = pd.to_datetime(df_full['date'], errors='coerce')
    
    numeric_cols = ['open', 'high', 'low', 'close', 'volume']
    for col in numeric_cols:
        if col in df_full.columns:
            df_full[col] = pd.to_numeric(df_full[col], errors='coerce')
            
    df = df_full.dropna(subset=['date', 'close']).copy()
    df = df.sort_values(by=['tickerSymbol', 'date']).reset_index(drop=True)
    df = df[df['tickerSymbol'] == ticker].copy()
    df = df.reset_index(drop=True)
    
    if len(df) == 0:
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
    df['bb_lower'] = bb.iloc[:, 0]
    df['bb_upper'] = bb.iloc[:, 2]
    bb_diff = df['bb_upper'] - df['bb_lower']
    df['bb_score'] = np.where(bb_diff != 0, ((df['close'] - df['bb_lower']) / bb_diff) * 100, 50).clip(0, 100)
    sti = ta.supertrend(df['high'], df['low'], df['close'], length=10, multiplier=3.0)
    st_val = sti['SUPERT_10_3.0']
    df['st_dir'] = sti['SUPERTd_10_3.0']
    df['atr_10'] = ta.atr(df['high'], df['low'], df['close'], length=10)
    st_dist = df['close'] - st_val
    df['st_score'] = (50 + ((st_dist / (df['atr_10'] * 3.0)) * 50)).clip(0, 100)
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
    test_df = df[df['date'] >= pd.to_datetime('2020-01-01')].copy()
    
    return {
        'index_arr': test_df['master_index'].values,
        'close_arr': test_df['close'].values,
        'high_arr': test_df['high'].values,
        'low_arr': test_df['low'].values,
        'mdm_arr': test_df['mdm'].values,
        'atr_arr': test_df['atr_14'].values,
        'st_dir_arr': test_df['st_dir'].values,
        'first_price': test_df.iloc[0]['close'],
        'last_price': test_df.iloc[-1]['close'],
        'n': len(test_df)
    }

# Global data dict for workers
global_data = None

def init_worker(data_dict):
    global global_data
    global_data = data_dict

def run_backtest_inner(combo):
    # combo: (levels, aym_val, aym_lim_val, atr_m_val, sl_val)
    levels, aym, aym_lim, atr_m, sl = combo
    
    index_arr = global_data['index_arr']
    close_arr = global_data['close_arr']
    high_arr = global_data['high_arr']
    low_arr = global_data['low_arr']
    mdm_arr = global_data['mdm_arr']
    atr_arr = global_data['atr_arr']
    n = global_data['n']
    
    initial_capital = 10000.0
    capital = initial_capital
    shares = 0
    buy_price = 0.0
    current_max = 0.0
    
    wins = 0
    losses = 0
    gross_profit = 0.0
    gross_loss = 0.0
    
    total_bars = 0
    completed_trades = 0
    
    sum_return_pct = 0.0
    sum_aae = 0.0
    sum_afe = 0.0
    
    buy_idx = -1
    lowest_during_trade = 0.0
    highest_during_trade = 0.0
    
    peak_capital = capital
    max_dd = 0.0
    
    for i in range(1, n):
        idx = index_arr[i]
        idx_prev = index_arr[i-1]
        price = close_arr[i]
        p_high = high_arr[i]
        p_low = low_arr[i]
        mdm = mdm_arr[i]
        atr = atr_arr[i]
        
        if shares == 0:
            crossover = False
            for lvl in levels:
                if idx > lvl and idx_prev <= lvl:
                    crossover = True
                    break
            
            if crossover:
                cost = price
                shares = int(capital // cost)
                if shares > 0:
                    capital -= (shares * cost)
                    buy_price = price
                    current_max = p_high
                    buy_idx = i
                    lowest_during_trade = p_low
                    highest_during_trade = p_high
        else:
            current_max = max(current_max, p_high)
            lowest_during_trade = min(lowest_during_trade, p_low)
            highest_during_trade = max(highest_during_trade, p_high)
            
            hit_tp = False
            hit_sl = False
            hit_trail = False
            
            if aym is not None:
                target_p = buy_price * (1 + (mdm * aym / 100.0))
                hit_tp = (price >= target_p) and (idx < aym_lim)
                
            if sl is not None:
                sl_level = buy_price * (1 - (mdm * sl / 100.0))
                hit_sl = price <= sl_level
                
            if atr_m is not None:
                trail_level = current_max - (atr * atr_m)
                hit_trail = (price <= trail_level) and (price > buy_price)
            
            if hit_tp or hit_sl or hit_trail:
                revenue = (shares * price)
                profit = revenue - (shares * buy_price)
                pct_return = (price / buy_price - 1) * 100
                
                if profit > 0:
                    wins += 1
                    gross_profit += profit
                else:
                    losses += 1
                    gross_loss += abs(profit)
                    
                capital += revenue
                peak_capital = max(peak_capital, capital)
                drawdown = (peak_capital - capital) / peak_capital
                max_dd = max(max_dd, drawdown)
                
                sum_return_pct += pct_return
                sum_aae += (lowest_during_trade / buy_price - 1) * 100
                sum_afe += (highest_during_trade / buy_price - 1) * 100
                
                total_bars += (i - buy_idx)
                completed_trades += 1
                
                shares = 0
                buy_idx = -1

    if shares > 0:
        revenue = shares * close_arr[-1]
        profit = revenue - (shares * buy_price)
        pct_return = (close_arr[-1] / buy_price - 1) * 100
        
        if profit > 0:
            wins += 1
            gross_profit += profit
        else:
            losses += 1
            gross_loss += abs(profit)
            
        capital += revenue
        peak_capital = max(peak_capital, capital)
        drawdown = (peak_capital - capital) / peak_capital
        max_dd = max(max_dd, drawdown)
        
        sum_return_pct += pct_return
        sum_aae += (lowest_during_trade / buy_price - 1) * 100
        sum_afe += (highest_during_trade / buy_price - 1) * 100
        
        total_bars += (n - 1 - buy_idx)
        completed_trades += 1

    roi = ((capital - initial_capital) / initial_capital) * 100
    win_rate = (wins / (wins + losses)) * 100 if (wins + losses) > 0 else 0
    avg_bars = (total_bars / completed_trades) if completed_trades > 0 else 0
    avg_ret = (sum_return_pct / completed_trades) if completed_trades > 0 else 0
    aae = (sum_aae / completed_trades) if completed_trades > 0 else 0
    afe = (sum_afe / completed_trades) if completed_trades > 0 else 0
    years = (n / 252)
    cagr = ((capital / initial_capital) ** (1 / years) - 1) * 100 if years > 0 and capital > 0 else 0
    
    bh_roi = ((global_data['last_price'] / global_data['first_price']) - 1) * 100
    roi_delta = roi - bh_roi
    
    return {
        'levels': tuple(levels),
        'aym': aym,
        'aym_lim': aym_lim,
        'atr_m': atr_m,
        'sl': sl,
        'sys_roi': roi,
        'bh_roi': bh_roi,
        'roi_margin': roi_delta,
        'trades': completed_trades,
        'win_rate': win_rate,
        'max_dd': max_dd * 100,
        'aae': aae,
        'afe': afe,
        'cagr': cagr,
        'avg_ret': avg_ret,
        'avg_bars': avg_bars
    }

def main():
    ticker = 'COMI'
    print(f"Preparing data for {ticker}...")
    data_dict = prepare_data(ticker)
    if not data_dict:
        return
        
    print(f"Data ready. Found {data_dict['n']} bars.")
    
    # Generate exactly 50,220 combinations
    all_levels = [14.6, 23.6, 38.2, 50.0, 61.8]
    level_combos = []
    for r in range(1, len(all_levels) + 1):
        level_combos.extend(list(itertools.combinations(all_levels, r)))
        
    aym_combos = [(v, l) for v in range(2, 13) for l in [50.0, 61.8, 78.6, 88.6]] + [(None, None)]
    atr_m_vals = list(range(2, 7)) + [None]
    sl_vals = [4, 5, 6, 8, 10, None]
    
    grid = []
    for lvls in level_combos:
        for aym_c in aym_combos:
            for atr in atr_m_vals:
                for sl in sl_vals:
                    grid.append((lvls, aym_c[0], aym_c[1], atr, sl))
                    
    print(f"Generated {len(grid)} combinations.")
    
    start_time = time.time()
    
    best_combo = None
    best_margin = -float('inf')
    valid_results = []
    
    workers = multiprocessing.cpu_count()
    print(f"Starting ProcessPoolExecutor with {workers} workers...")
    
    # Run parallel
    with ProcessPoolExecutor(max_workers=workers, initializer=init_worker, initargs=(data_dict,)) as executor:
        for idx, result in enumerate(executor.map(run_backtest_inner, grid, chunksize=1000)):
            
            # Apply strict constraints
            if result['win_rate'] >= 90.0 and result['avg_bars'] <= 36.0:
                valid_results.append(result)
                if result['roi_margin'] > best_margin:
                    best_margin = result['roi_margin']
                    best_combo = result
            
            if (idx + 1) % 5000 == 0:
                print(f"Processed {idx + 1} / {len(grid)}...")
                
    end_time = time.time()
    print(f"\nOptimization completed in {end_time - start_time:.2f} seconds.")
    
    if not valid_results:
        print("No combinations met the constraints (Win rate >= 90% and Avg Bars <= 36).")
        return
        
    # Sort valid results by ROI margin desc
    valid_results.sort(key=lambda x: x['roi_margin'], reverse=True)
    df_res = pd.DataFrame(valid_results)
    out_file = 'optimizer_results_COMI.csv'
    df_res.to_csv(out_file, index=False)
    print(f"Saved {len(df_res)} valid combinations to {out_file}.")
    
    print("\n=========================================")
    print("BEST COMBINATION (Max ROI Margin)")
    print("=========================================")
    print(f"Levels:    {best_combo['levels']}")
    print(f"AYM:       {best_combo['aym']}")
    print(f"AYM Limit: {best_combo['aym_lim']}")
    print(f"ATR Mult:  {best_combo['atr_m']}")
    print(f"StopLoss:  {best_combo['sl']}")
    print("-----------------------------------------")
    print(f"Sys ROI:                {best_combo['sys_roi']:.2f}%")
    print(f"B&H ROI:                {best_combo['bh_roi']:.2f}%")
    print(f"ROI Margin:             {best_combo['roi_margin']:.2f}%")
    print(f"# of Trades:            {best_combo['trades']}")
    print(f"Win Rate:               {best_combo['win_rate']:.2f}%")
    print(f"Max Drawdown:           {best_combo['max_dd']:.2f}%")
    print(f"Avg Adverse Excursion:  {best_combo['aae']:.2f}%")
    print(f"Avg Favorable Excursion:{best_combo['afe']:.2f}%")
    print(f"Annual CAGR:            {best_combo['cagr']:.2f}%")
    print(f"Avg Return/Trade:       {best_combo['avg_ret']:.2f}%")
    print(f"Avg Bars/Trade:         {best_combo['avg_bars']:.1f}")
    print("=========================================\n")

if __name__ == '__main__':
    # Required for Windows multiprocessing
    multiprocessing.freeze_support()
    main()
