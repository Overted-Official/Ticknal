import pandas as pd
import numpy as np
from sklearn.metrics import precision_score, recall_score, f1_score

def evaluate_signals(signals_df: pd.DataFrame, price_df: pd.DataFrame, horizon: int = 15):
    """
    Evaluates the performance of generated signals over a given holding horizon.
    """
    # Merge signals with prices to compute returns
    df = pd.merge(signals_df, price_df[['tickerSymbol', 'date', 'close', 'low']], on=['tickerSymbol', 'date'], how='inner')
    
    # Calculate forward returns
    df['future_close'] = df.groupby('tickerSymbol')['close'].shift(-horizon)
    df['forward_return'] = df['future_close'] / df['close'] - 1
    
    # Filter to only BUY signals
    buys = df[df['signal'] == 'BUY'].dropna(subset=['forward_return'])
    
    if len(buys) == 0:
        return {"error": "No BUY signals generated."}
        
    # Win rate (percent of trades > 0%)
    win_rate = (buys['forward_return'] > 0).mean()
    
    # Profit factor (gross profit / gross loss)
    gross_profit = buys[buys['forward_return'] > 0]['forward_return'].sum()
    gross_loss = abs(buys[buys['forward_return'] < 0]['forward_return'].sum())
    profit_factor = gross_profit / (gross_loss + 1e-9)
    
    # Avg return per signal
    avg_return = buys['forward_return'].mean()
    
    return {
        "Total BUY signals": len(buys),
        "Win Rate": f"{win_rate*100:.2f}%",
        "Profit Factor": f"{profit_factor:.2f}",
        "Avg Return per Trade": f"{avg_return*100:.2f}%"
    }
