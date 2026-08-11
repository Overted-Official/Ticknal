import os
import sys
import pandas as pd
import joblib

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data.loader import load_price_data
from features.builder import build_feature_matrix
from config import HORIZONS, ARTIFACTS_DIR
from models.meta_model import combine_signals_simple
from signals.db_writer import write_signals_to_db

def main():
    print("--- Starting Historical Signal Generation ---")
    
    # 1. Load Data
    print("Loading historical data from CSV...")
    from data.loader import load_csv_data
    price_df = load_csv_data("../consolidated_prices.csv")
    if len(price_df) == 0:
        print("No data found!")
        return
        
    print(f"Loaded {len(price_df)} rows of price data.")

    # 2. Build Features
    print("Building features...")
    feature_df = build_feature_matrix(price_df)
    
    # Keep track of dates and tickers
    metadata = feature_df[['tickerSymbol', 'date']].copy()
    feature_cols = [c for c in feature_df.columns if c not in ['tickerSymbol', 'date']]
    
    for col in feature_cols:
        feature_df[col] = pd.to_numeric(feature_df[col], errors='coerce')
        
    X = feature_df[feature_cols]

    # 3. Load Models & Generate Signals
    print("Running inference over history...")
    probs = {}
    for h in HORIZONS:
        model_path = os.path.join(ARTIFACTS_DIR, f"xgb_h{h}.joblib")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model for horizon {h}d not found at {model_path}. Run training first.")
        
        print(f"Predicting horizon {h}d...")
        model = joblib.load(model_path)
        probs[h] = model.predict_proba(X)[:, 1]
        
    # Combine signals
    print("Combining signals...")
    signals_df = combine_signals_simple(probs)
    
    # Add metadata
    signals_df['tickerSymbol'] = metadata['tickerSymbol'].values
    signals_df['date'] = metadata['date'].values
    signals_df['model_version'] = "v1.0-rolling"
    
    # Drop NaNs that might have been caused by feature building (e.g. initial 200 days of MAs)
    signals_df = signals_df.dropna(subset=['signal'])
    
    # Reorder columns
    cols = ['tickerSymbol', 'date', 'signal', 'confidence'] + [f'prob_{h}d' for h in HORIZONS] + ['model_version']
    signals_df = signals_df[cols]
    
    print(f"Generated {len(signals_df)} historical signals.")

    # 4. Write to DB
    print("Writing to DB (this might take a minute)...")
    write_signals_to_db(signals_df)
    
    print("--- Historical Signal Generation Complete ---")

if __name__ == "__main__":
    main()
