import pandas as pd
import pandas_ta as ta
import numpy as np

def compute_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes all technical indicators for a single ticker's DataFrame.
    Expects DataFrame with columns: ['open', 'high', 'low', 'close', 'volume', 'date']
    """
    # Ensure sorted by date
    df = df.sort_values('date').copy()
    
    # 1. Price Position
    df['sma_20'] = ta.sma(df['close'], length=20)
    df['sma_50'] = ta.sma(df['close'], length=50)
    df['sma_200'] = ta.sma(df['close'], length=200)
    
    df['price_vs_sma20'] = df['close'] / df['sma_20'] - 1
    df['price_vs_sma50'] = df['close'] / df['sma_50'] - 1
    df['price_vs_sma200'] = df['close'] / df['sma_200'] - 1
    
    df['norm_price_14'] = _normalize_price(df['close'], length=14)
    df['norm_price_30'] = _normalize_price(df['close'], length=30)
    
    # 2. Momentum
    df['rsi_14'] = ta.rsi(df['close'], length=14)
    df['rsi_7'] = ta.rsi(df['close'], length=7)
    df['rsi_5'] = ta.rsi(df['close'], length=5)
    
    stoch = ta.stoch(df['high'], df['low'], df['close'], k=14, d=3)
    if stoch is not None:
        df['stoch_k'] = stoch['STOCHk_14_3_3']
        df['stoch_d'] = stoch['STOCHd_14_3_3']
    else:
        df['stoch_k'] = np.nan
        df['stoch_d'] = np.nan
        
    df['roc_10'] = ta.roc(df['close'], length=10)
    df['roc_20'] = ta.roc(df['close'], length=20)
    
    # 3. Trend
    adx = ta.adx(df['high'], df['low'], df['close'], length=14)
    if adx is not None:
        df['adx'] = adx['ADX_14']
        df['di_plus'] = adx['DMP_14']
        df['di_minus'] = adx['DMN_14']
    else:
        df['adx'], df['di_plus'], df['di_minus'] = np.nan, np.nan, np.nan
        
    df['ma_spread'] = df['sma_50'] / df['sma_200'] - 1
    
    macd = ta.macd(df['close'])
    if macd is not None:
        df['macd_hist'] = macd['MACDh_12_26_9']
    else:
        df['macd_hist'] = np.nan

    # 4. Volatility
    bbands = ta.bbands(df['close'], length=20)
    if bbands is not None:
        df['bb_upper'] = bbands['BBU_20_2.0_2.0']
        df['bb_lower'] = bbands['BBL_20_2.0_2.0']
        df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / df['close']
        df['bb_percent_b'] = bbands['BBP_20_2.0_2.0']
    else:
        df['bb_upper'], df['bb_lower'], df['bb_width'], df['bb_percent_b'] = np.nan, np.nan, np.nan, np.nan

    df['atr_14'] = ta.atr(df['high'], df['low'], df['close'], length=14)
    df['atr_7'] = ta.atr(df['high'], df['low'], df['close'], length=7)
    df['atr_21'] = ta.atr(df['high'], df['low'], df['close'], length=21)
    
    df['atr_ratio'] = df['atr_7'] / df['atr_21']
    df['atr_normalized'] = df['atr_14'] / df['close']
    
    df['realized_vol_20'] = np.log(df['close'] / df['close'].shift(1)).rolling(20).std() * np.sqrt(252)

    # 5. Volume
    df['obv'] = ta.obv(df['close'], df['volume'])
    df['obv_slope_10'] = df['obv'].diff(10) / df['obv'].abs().rolling(10).mean() # normalized slope
    
    df['mfi_14'] = ta.mfi(df['high'], df['low'], df['close'], df['volume'], length=14)
    
    df['vol_sma_5'] = ta.sma(df['volume'], length=5)
    df['vol_sma_20'] = ta.sma(df['volume'], length=20)
    df['vol_ratio'] = df['vol_sma_5'] / df['vol_sma_20']
    
    df_dt_index = df.set_index('date')
    vwap = ta.vwap(df_dt_index['high'], df_dt_index['low'], df_dt_index['close'], df_dt_index['volume'])
    if vwap is not None:
        df['price_vs_vwap'] = (df['close'].values / vwap.values) - 1
    else:
        df['price_vs_vwap'] = np.nan

    # 7. Flow / Calendar
    df['cmf_20'] = ta.cmf(df['high'], df['low'], df['close'], df['volume'], length=20)
    
    # Calendar features
    # Assuming 'date' is datetime
    if not pd.api.types.is_datetime64_any_dtype(df['date']):
        df['date_dt'] = pd.to_datetime(df['date'])
    else:
        df['date_dt'] = df['date']
        
    df['day_of_week'] = df['date_dt'].dt.dayofweek
    df['month'] = df['date_dt'].dt.month
    df['day_of_year'] = df['date_dt'].dt.dayofyear
    
    # Drop temporary columns and return
    cols_to_drop = ['sma_20', 'sma_50', 'sma_200', 'atr_7', 'atr_14', 'atr_21', 'obv', 'vol_sma_5', 'vol_sma_20', 'date_dt']
    df = df.drop(columns=[c for c in cols_to_drop if c in df.columns])
    
    return df

def _normalize_price(series: pd.Series, length: int) -> pd.Series:
    """Normalize price to a 0-100 oscillator like PSI does."""
    lowest = series.rolling(length).min()
    highest = series.rolling(length).max()
    return 100 * (series - lowest) / (highest - lowest + 1e-9)
