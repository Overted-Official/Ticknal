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

def prepare_data(ticker, df_full):
    df = df_full[df_full['ticker_symbol'] == ticker].copy()
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
    df = df.dropna(subset=['master_index', 'mdm', 'atr_14']).copy()
    
    # 2021-01-01 to latest
    test_df = df[df['date'] >= pd.to_datetime('2021-01-01')].copy()
    
    if len(test_df) < 50:
        return None
        
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

global_data = None
def init_worker(data_dict):
    global global_data
    global_data = data_dict

def run_backtest_inner(combo):
    levels, smart_exit_lvl, aym, aym_lim, atr_m, sl = combo
    
    index_arr = global_data['index_arr']
    close_arr = global_data['close_arr']
    high_arr = global_data['high_arr']
    low_arr = global_data['low_arr']
    mdm_arr = global_data['mdm_arr']
    atr_arr = global_data['atr_arr']
    st_dir_arr = global_data['st_dir_arr']
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
        st_dir = st_dir_arr[i]
        
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
                
            if smart_exit_lvl is not None:
                hit_smart = (idx < smart_exit_lvl) and (idx_prev >= smart_exit_lvl) and (st_dir == -1) and (price > buy_price)
            
            if hit_tp or hit_sl or hit_trail or hit_smart:
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
        'smart_exit_lvl': smart_exit_lvl,
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
    data_path = '../../consolidated_prices_fixed.csv'
    df_full = pd.read_csv(data_path, low_memory=False)
    df_full['date'] = pd.to_datetime(df_full['date'], errors='coerce')
    for col in ['open', 'high', 'low', 'close', 'volume']:
        df_full[col] = pd.to_numeric(df_full[col], errors='coerce')
    df_full = df_full.dropna(subset=['date', 'close'])
    
    target_tickers = ['ACAP', 'ADIB', 'AFMC', 'ARCC', 'BTFH', 'CANA', 'COMI', 'EALR', 'EFIC', 'EFID', 'EGAL', 'ETEL', 'GBCO', 'HDBK', 'ICFC', 'IFAP', 'IRON', 'JUFO', 'MBEG', 'MBSC', 'MCQE', 'MPCI', 'NIPH', 'OIH', 'OLFI', 'ORHD', 'ORWE', 'PHDC', 'POUL', 'SCEM', 'SCFM', 'SWDY', 'WKOL']
    all_tickers = df_full['ticker_symbol'].unique()
    tickers = [t for t in target_tickers if t in all_tickers]
    print(f"Loaded {len(tickers)} targeted tickers from dataset.")
    
    # Generate exactly 50,220 combinations (No smart exit)
    all_levels = [14.6, 23.6, 38.2, 50.0, 61.8]
    level_combos = []
    for r in range(1, len(all_levels) + 1):
        level_combos.extend(list(itertools.combinations(all_levels, r)))
        
    smart_exit_vals = [None]
    aym_combos = [(v, l) for v in range(2, 13) for l in [50.0, 61.8, 78.6, 88.6]] + [(None, None)]
    atr_m_vals = list(range(2, 7)) + [None]
    sl_vals = [4, 5, 6, 8, 10, None]
    
    grid = []
    for lvls in level_combos:
        for sm in smart_exit_vals:
            for aym_c in aym_combos:
                for atr in atr_m_vals:
                    for sl in sl_vals:
                        grid.append((lvls, sm, aym_c[0], aym_c[1], atr, sl))
                        
    print(f"Grid size per ticker: {len(grid)} combinations.")
    
    out_file = '../../optimized_parameters_all.csv'
    with open(out_file, 'w') as f:
        # Write exact requested headers
        f.write("ticker_id\tL-14.6\tL-23.6\tL-38.2\tL-50.0\tL-61.8\tS-14.6\tS-23.6\tS-38.2\tS-50.0\tS-61.8\tUse Smrt Index Exit\tExit Level\tUse AYM\tAYM TP Multiplier\tAYM Limit\tUse ATR\tATR Distance\tUse Stoploss\tStoploss Level\tSys ROI\tB&H ROI\tROI Margin\t# of Trades\tWin Rate\tMax Drawdown\tAvg. Adverse Excursion\tAvg. Favorable Excursion\tAnnual CAGR\tAvg. Return/Trade\tAvg Bars/Trade\n")

    workers = multiprocessing.cpu_count()
    
    for idx, ticker in enumerate(tickers):
        print(f"\n[{idx+1}/{len(tickers)}] Processing {ticker}...")
        data_dict = prepare_data(ticker, df_full)
        
        if not data_dict:
            print(f"Skipping {ticker} (insufficient data).")
            continue
            
        start_time = time.time()
        
        best_combo = None
        valid_results = []
        all_results = []
        
        with ProcessPoolExecutor(max_workers=workers, initializer=init_worker, initargs=(data_dict,)) as executor:
            for res in executor.map(run_backtest_inner, grid, chunksize=2000):
                # Filter meaningless results with no trades
                if res['trades'] > 0:
                    all_results.append(res)
                    if res['win_rate'] >= 90.0 and res['avg_bars'] <= 36.0:
                        valid_results.append(res)
                        
        if valid_results:
            # Sort by max ROI Margin
            valid_results.sort(key=lambda x: x['roi_margin'], reverse=True)
            best_combo = valid_results[0]
            print(f"Found {len(valid_results)} combos meeting constraints. Best margin: {best_combo['roi_margin']:.2f}%")
        elif all_results:
            # No valid results, apply fallback multi-objective sort
            all_results.sort(key=lambda x: (x['sys_roi'], x['win_rate'], -x['avg_bars']), reverse=True)
            best_combo = all_results[0]
            print(f"No combos met constraints. Fallback selected (ROI: {best_combo['sys_roi']:.2f}%, Win: {best_combo['win_rate']:.2f}%, Bars: {best_combo['avg_bars']:.1f})")
            
        end_time = time.time()
        print(f"Finished {ticker} in {end_time - start_time:.2f} seconds.")
        
        if best_combo:
            c = best_combo
            lvls = c['levels']
            row = [
                ticker,
                "TRUE" if 14.6 in lvls else "FALSE",
                "TRUE" if 23.6 in lvls else "FALSE",
                "TRUE" if 38.2 in lvls else "FALSE",
                "TRUE" if 50.0 in lvls else "FALSE",
                "TRUE" if 61.8 in lvls else "FALSE",
                "1" if 14.6 in lvls else "null",
                "1" if 23.6 in lvls else "null",
                "1" if 38.2 in lvls else "null",
                "1" if 50.0 in lvls else "null",
                "1" if 61.8 in lvls else "null",
                "TRUE" if c['smart_exit_lvl'] is not None else "FALSE",
                str(c['smart_exit_lvl']) if c['smart_exit_lvl'] is not None else "null",
                "TRUE" if c['aym'] is not None else "FALSE",
                str(c['aym']) if c['aym'] is not None else "null",
                str(c['aym_lim']) if c['aym_lim'] is not None else "null",
                "TRUE" if c['atr_m'] is not None else "FALSE",
                str(c['atr_m']) if c['atr_m'] is not None else "null",
                "TRUE" if c['sl'] is not None else "FALSE",
                str(c['sl']) if c['sl'] is not None else "null",
                f"{c['sys_roi']:.2f}",
                f"{c['bh_roi']:.2f}",
                f"{c['roi_margin']:.2f}",
                str(c['trades']),
                f"{c['win_rate']:.2f}",
                f"{c['max_dd']:.2f}",
                f"{c['aae']:.2f}",
                f"{c['afe']:.2f}",
                f"{c['cagr']:.2f}",
                f"{c['avg_ret']:.2f}",
                f"{c['avg_bars']:.1f}"
            ]
            
            with open(out_file, 'a') as f:
                f.write("\t".join(row) + "\n")

if __name__ == '__main__':
    multiprocessing.freeze_support()
    main()
