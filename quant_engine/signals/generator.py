import pandas as pd
import joblib
import os
from config import ARTIFACTS_DIR
from models.meta_model import combine_signals_simple

def generate_signals(features_df: pd.DataFrame, horizons: list[int]) -> pd.DataFrame:
    """
    Runs XGBoost inference on the latest features and generates signals.
    """
    print(f"Generating signals for {len(features_df)} rows...")
    
    # Load models
    models = {}
    for h in horizons:
        model_path = os.path.join(ARTIFACTS_DIR, f"xgb_h{h}.joblib")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model for horizon {h}d not found at {model_path}. Run training first.")
        models[h] = joblib.load(model_path)
    
    feature_cols = [c for c in features_df.columns if c not in ['tickerSymbol', 'date']]
    X = features_df[feature_cols]
    
    # Run inference for each horizon
    probs = {}
    for h in horizons:
        probs[h] = models[h].predict_proba(X)[:, 1]
        
    # Combine signals
    signals_df = combine_signals_simple(probs)
    
    # Add metadata
    signals_df['tickerSymbol'] = features_df['tickerSymbol'].values
    signals_df['date'] = features_df['date'].values
    signals_df['model_version'] = "v1.0-rolling"
    
    # Reorder columns
    cols = ['tickerSymbol', 'date', 'signal', 'confidence'] + [f'prob_{h}d' for h in horizons] + ['model_version']
    return signals_df[cols]
