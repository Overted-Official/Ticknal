import pandas as pd
import numpy as np
import pandas_ta as ta
import numba as nb
import sys

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

def main():
    print("Loading Data...")
    data_path = '../../consolidated_prices.csv'
    df_full = pd.read_csv(data_path, low_memory=False)
    df_full['date'] = pd.to_datetime(df_full['date'], errors='coerce')
    
    numeric_cols = ['open', 'high', 'low', 'close', 'volume']
    for col in numeric_cols:
        if col in df_full.columns:
            df_full[col] = pd.to_numeric(df_full[col], errors='coerce')
            
    df = df_full.dropna(subset=['date', 'close']).copy()
    df = df.sort_values(by=['tickerSymbol', 'date']).reset_index(drop=True)
    df = df[df['tickerSymbol'] == 'COMI'].copy()
    df = df.reset_index(drop=True)
    
    print("Computing Indicators 1:1 with TradingView...")
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
    
    w_price = 21.0
    w_rsi = 10.0
    w_banker = 5.0
    w_bb = 4.0
    w_st = 44.0
    w_adx = 10.0
    w_ma = 4.0
    w_slope = 1.0
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
    
    df['master_index'] = np.round(df['master_index_raw'] / 16.18) * 16.18
    
    df['tr'] = true_range(df)
    df['candle_intensity'] = (df['tr'] / df['close']) * 100.0
    df['mdm'] = df['candle_intensity'].rolling(252).median()
    
    df = df.dropna(subset=['master_index', 'mdm', 'atr_14']).copy()
    
    test_df = df[df['date'] >= pd.to_datetime('2020-01-01')].copy()
    bh_roi = (test_df.iloc[-1]['close'] / test_df.iloc[0]['close'] - 1) * 100
    
    print("\n=========================================")
    print(f"B&H ROI: {bh_roi:.2f}%")
    print("=========================================\n")
    
    levels = [14.6, 23.6]
    aym = 3.5
    aym_lim = 61.8
    atr_m = 2.5
    sl = 6.0
    
    index_arr = test_df['master_index'].values
    close_arr = test_df['close'].values
    high_arr = test_df['high'].values
    low_arr = test_df['low'].values
    mdm_arr = test_df['mdm'].values
    atr_arr = test_df['atr_14'].values
    st_dir_arr = test_df['st_dir'].values
    date_arr = test_df['date'].values
    n = len(test_df)
    
    capital = 10000.0
    shares = 0
    buy_price = 0.0
    current_max = 0.0
    
    wins = 0
    losses = 0
    gross_profit = 0.0
    gross_loss = 0.0
    
    trade_log = []
    
    for i in range(1, n):
        idx = index_arr[i]
        idx_prev = index_arr[i-1]
        price = close_arr[i]
        p_high = high_arr[i]
        mdm = mdm_arr[i]
        atr = atr_arr[i]
        st_dir = st_dir_arr[i]
        date = date_arr[i]
        
        if shares == 0:
            crossover = any((idx > lvl) and (idx_prev <= lvl) for lvl in levels)
            if crossover:
                cost = price
                shares = int(capital // cost)
                if shares > 0:
                    capital -= (shares * cost)
                    buy_price = price
                    current_max = p_high
                    trade_log.append(f"BUY at {price:.2f} on {str(date)[:10]} (Index crossed. Prev: {idx_prev}, Now: {idx})")
        else:
            current_max = max(current_max, p_high)
            
            target_p = buy_price * (1 + (mdm * aym / 100.0))
            trail_level = current_max - (atr * atr_m)
            sl_level = buy_price * (1 - (mdm * sl / 100.0))
            
            hit_tp = (price >= target_p) and (idx < aym_lim)
            hit_sl = price <= sl_level
            hit_trail = (price <= trail_level) and (price > buy_price)
            hit_index = (idx < 50.0) and (idx_prev >= 50.0) and (st_dir == -1) and (price > buy_price)
            
            if hit_tp or hit_sl or hit_trail or hit_index:
                reason = "AYM_TP" if hit_tp else "ATR_Trail" if hit_trail else "StopLoss" if hit_sl else "Index_Crossunder"
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
                trade_log.append(f"SELL at {price:.2f} on {str(date)[:10]} | Reason: {reason} | Return: {pct_return:.2f}% | New Capital: ${capital:.2f}")
                shares = 0

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
        trade_log.append(f"CLOSE_OUT at {close_arr[-1]:.2f} on {str(date_arr[-1])[:10]} | Return: {pct_return:.2f}% | New Capital: ${capital:.2f}")

    roi = ((capital - 10000) / 10000) * 100
    win_rate = (wins / (wins + losses)) * 100 if (wins + losses) > 0 else 0
    profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')
    roi_delta = roi - bh_roi
    
    # Calculate avg bars
    completed_trades = wins + losses
    avg_bars = 0
    if completed_trades > 0 and len(trade_log) >= 2:
        total_bars = 0
        buy_date = None
        for log in trade_log:
            if "BUY at" in log:
                # format: BUY at 26.97 on 2022-04-17 ...
                parts = log.split(" on ")
                if len(parts) > 1:
                    date_str = parts[1][:10]
                    buy_idx = test_df[test_df['date'] == pd.to_datetime(date_str)].index
                    if len(buy_idx) > 0:
                        buy_date = buy_idx[0]
            elif "SELL at" in log or "CLOSE_OUT at" in log:
                if buy_date is not None:
                    parts = log.split(" on ") if " on " in log else log.split(" | ") # CLOSE_OUT logic is different but let's just parse the index if possible
                    # It's easier just to parse the date from the string
                    import re
                    match = re.search(r'\d{4}-\d{2}-\d{2}', log)
                    if match:
                        date_str = match.group()
                        sell_idx = test_df[test_df['date'] == pd.to_datetime(date_str)].index
                        if len(sell_idx) > 0:
                            total_bars += (sell_idx[0] - buy_date)
                    buy_date = None
        avg_bars = total_bars / completed_trades
    
    print("\n--- TRADE LOG ---")
    for log in trade_log:
        print(log)
        
    print("\n--- PERFORMANCE METRICS ---")
    print(f"Final Capital: ${capital:.2f}")
    print(f"Strategy ROI: {roi:.2f}%")
    print(f"B&H ROI: {bh_roi:.2f}%")
    print(f"ROI Delta: {roi_delta:.2f}%")
    print(f"Win Rate: {win_rate:.2f}% ({wins} Wins / {losses} Losses)")
    print(f"Profit Factor: {profit_factor:.2f}")
    print(f"Total Trades: {wins + losses}")
    print(f"Avg Bars per Trade: {avg_bars:.1f}")

if __name__ == "__main__":
    main()
