import xgboost as xgb
import pandas as pd
import numpy as np
import joblib
import os
from config import ARTIFACTS_DIR

def train_meta_model(horizon_probs: pd.DataFrame, target_col: str):
    """
    Trains a small meta-model to combine horizon probabilities into a single BUY/SELL/HOLD signal.
    Input df should have columns like: ['prob_5d', 'prob_10d', 'prob_15d', 'prob_20d', 'prob_25d', 'meta_target']
    
    meta_target: 0=HOLD/SELL, 1=BUY (could be multi-class 0, 1, 2)
    """
    print("Training meta-model...")
    features = [c for c in horizon_probs.columns if c.startswith('prob_')]
    
    X = horizon_probs[features]
    y = horizon_probs[target_col]
    
    clf = xgb.XGBClassifier(
        objective="binary:logistic",
        max_depth=3, # Keep it very simple to prevent overfitting the probabilities
        learning_rate=0.01,
        n_estimators=100,
        random_state=42
    )
    
    clf.fit(X, y)
    
    # Save meta-model
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    joblib.dump(clf, os.path.join(ARTIFACTS_DIR, "meta_model.joblib"))
    
    return clf

def combine_signals_simple(probs: dict[int, pd.Series]) -> pd.DataFrame:
    """
    A simple heuristic combination instead of ML, similar to the original PSI approach.
    Used if we don't have enough data for a meta-model.
    """
    # Weight short-term less, medium/long-term more
    weights = {
        5: 0.10,
        10: 0.20,
        15: 0.30,
        20: 0.25,
        25: 0.15
    }
    
    # probs is a dict mapping horizon (int) to a pandas Series or numpy array of probabilities (0 to 1)
    
    # Simple voting: average the probabilities across all available horizons
    first_key = list(probs.keys())[0]
    length = len(probs[first_key])
    total_score = pd.Series(0.0, index=range(length))
    count = 0
    for h, p in probs.items():
        total_score += p * weights[h]
        
    df = pd.DataFrame()
    for h, p in probs.items():
        df[f'prob_{h}d'] = p
        
    df['confidence'] = total_score
    
    # Generate signal string based on heuristics
    # Strong buy: high overall confidence AND all horizons agree
    all_agree = (df['prob_5d'] > 0.5) & (df['prob_15d'] > 0.5) & (df['prob_25d'] > 0.5)
    
    df['signal'] = 'HOLD'
    df.loc[(df['confidence'] > 0.65) & all_agree, 'signal'] = 'BUY'
    
    # Sell if curve inverts or confidence drops heavily
    df.loc[(df['prob_5d'] < 0.4) & (df['prob_25d'] < 0.4), 'signal'] = 'SELL'
    
    return df
