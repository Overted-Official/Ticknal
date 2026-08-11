import pandas as pd
import numpy as np
import xgboost as xgb
import joblib
import os
from sklearn.metrics import log_loss, roc_auc_score
from config import ARTIFACTS_DIR

def get_rolling_windows(dates: pd.Series, train_years: int = 5, purge_days: int = 30):
    """
    Generates indices for Walk-Forward Validation using a rolling window.
    Yields (train_idx, val_idx, test_idx).
    """
    unique_dates = np.sort(dates.unique())
    start_date = pd.to_datetime(unique_dates[0])
    end_date = pd.to_datetime(unique_dates[-1])
    
    current_train_start = start_date
    
    while True:
        train_end = current_train_start + pd.DateOffset(years=train_years)
        val_end = train_end + pd.DateOffset(years=1)
        
        # Stop if validation set goes beyond available data
        if train_end >= end_date:
            break
            
        # Purge gap prevents target leakage (e.g., waiting for 25d horizon to resolve)
        purge_gap = pd.DateOffset(days=purge_days)
        
        train_mask = (dates >= current_train_start) & (dates < (train_end - purge_gap))
        val_mask = (dates >= train_end) & (dates < (val_end - purge_gap))
        
        yield dates[train_mask].index, dates[val_mask].index
        
        # Roll forward by 1 year
        current_train_start += pd.DateOffset(years=1)

def train_horizon_models(df: pd.DataFrame, horizons: list[int], feature_cols: list[str]):
    """
    Trains XGBoost models for each horizon using the MOST RECENT 5-year rolling window.
    This is the production training mode.
    """
    print(f"Training on {len(df)} rows across {len(feature_cols)} features...")
    
    # Take the last 6 years of data (5 for train, 1 for validation to tune early stopping)
    # Actually, for production, we can just use the last 5 years for training and 
    # validate on the last 1 year of that 5-year chunk.
    unique_dates = np.sort(df['date'].unique())
    if len(unique_dates) == 0:
        return {}
        
    latest_date = pd.to_datetime(unique_dates[-1])
    val_start = latest_date - pd.DateOffset(years=1)
    train_start = val_start - pd.DateOffset(years=4) # 4+1 = 5 years total
    
    purge_gap = pd.DateOffset(days=30)
    
    train_idx = df[(df['date'] >= train_start) & (df['date'] < (val_start - purge_gap))].index
    val_idx = df[(df['date'] >= val_start)].index
    
    print(f"Train set: {len(train_idx)} rows. Val set: {len(val_idx)} rows.")
    
    X_train, X_val = df.loc[train_idx, feature_cols], df.loc[val_idx, feature_cols]
    
    models = {}
    
    # Ensure artifacts dir exists
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    
    for h in horizons:
        print(f"--- Training Horizon {h}d ---")
        y_col = f'label_{h}d'
        
        # Drop rows where target is NaN (very end of dataset)
        valid_train = ~df.loc[train_idx, y_col].isna()
        valid_val = ~df.loc[val_idx, y_col].isna()
        
        y_train = df.loc[train_idx, y_col][valid_train]
        X_train_h = X_train[valid_train]
        
        y_val = df.loc[val_idx, y_col][valid_val]
        X_val_h = X_val[valid_val]
        
        if len(y_train) < 100 or y_train.sum() == 0:
            print(f"Not enough positive samples for horizon {h}d. Skipping.")
            continue
            
        # Class imbalance handling
        pos_weight = (len(y_train) - y_train.sum()) / (y_train.sum() + 1e-5)
        
        clf = xgb.XGBClassifier(
            objective="binary:logistic",
            eval_metric=["logloss", "auc"],
            max_depth=6,
            learning_rate=0.05,
            n_estimators=500,
            subsample=0.8,
            colsample_bytree=0.8,
            min_child_weight=10,
            reg_alpha=0.1,
            reg_lambda=1.0,
            scale_pos_weight=pos_weight,
            early_stopping_rounds=50,
            n_jobs=-1,
            random_state=42
        )
        
        clf.fit(
            X_train_h, y_train,
            eval_set=[(X_val_h, y_val)],
            verbose=False
        )
        
        # Evaluate
        val_preds = clf.predict_proba(X_val_h)[:, 1]
        auc = roc_auc_score(y_val, val_preds)
        print(f"Horizon {h}d Validation AUC: {auc:.4f}, Best Iteration: {clf.best_iteration}")
        
        # Save model
        model_path = os.path.join(ARTIFACTS_DIR, f"xgb_h{h}.joblib")
        joblib.dump(clf, model_path)
        models[h] = clf
        
    return models
