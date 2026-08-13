import pandas as pd
import numpy as np
import xgboost as xgb
import lightgbm as lgb
import catboost as cb
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
import sys
import os
import warnings
warnings.filterwarnings('ignore')

def train_ensemble(X_train, y_train, X_test, direction_name):
    print(f"  Training XGBoost ({direction_name})...")
    model_xgb = xgb.XGBRegressor(
        n_estimators=300, 
        learning_rate=0.05, 
        max_depth=6, 
        random_state=42,
        reg_alpha=0.1,
        reg_lambda=1.0,
        gamma=0.1
    )
    model_xgb.fit(X_train, y_train)
    
    # CatBoost
    print(f"  Training CatBoost ({direction_name})...")
    model_cb = cb.CatBoostRegressor(
        iterations=300,
        learning_rate=0.05,
        depth=6,
        random_seed=42,
        verbose=0
    )
    model_cb.fit(X_train, y_train)
    
    # Predict
    pred_xgb = model_xgb.predict(X_test)
    pred_cb = model_cb.predict(X_test)
    
    # Average the predictions
    pred_ensemble = (pred_xgb + pred_cb) / 2.0
    
    return pred_ensemble, model_xgb, model_cb

def predict_ensemble(X, model_xgb, model_cb):
    pred_xgb = model_xgb.predict(X)
    pred_cb = model_cb.predict(X)
    return (pred_xgb + pred_cb) / 2.0

def main():
    use_psi8 = '--psi8' in sys.argv
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    input_file = 'dataset_psi8.csv' if use_psi8 else 'dataset_psi40.csv'
    dataset_path = os.path.join(script_dir, input_file)
    
    if not os.path.exists(dataset_path):
        print(f"Error: {dataset_path} not found.")
        return

    df = pd.read_csv(dataset_path)
    
    features = [
        'delta_to_red', 'delta_to_green', 'momentum', 'curr_is_bullish', 
        'last_red_is_bullish', 'last_green_is_bullish', 
        'bars_since_red', 'bars_since_green', 
        'swing_roi_up', 'swing_roi_down', 
        'roi_median_multiple_up', 'roi_median_multiple_down',
        'delta_to_red_lag5', 'momentum_lag5', 'delta_velocity',
        'psi_index_value',
        'volume_ratio', 'cumulative_volume_ratio',
        'latent_0', 'latent_1', 'latent_2', 'latent_3', 'latent_4', 'latent_5', 'latent_6', 'latent_7'
    ]
    target = 'target_exhaustion'
    
    df['date'] = pd.to_datetime(df['date'])
    train_df = df[df['date'] <= '2024-12-31']
    test_df = df[df['date'] >= '2025-01-01']
    
    print(f"{'PSI-8' if use_psi8 else 'PSI-40'} ENSEMBLE TRAINING")
    print(f"Train: {len(train_df)} rows | Test: {len(test_df)} rows | Features: {len(features)}")
    
    train_up = train_df[train_df['direction'] == 'up']
    train_down = train_df[train_df['direction'] == 'down']
    test_up = test_df[test_df['direction'] == 'up']
    test_down = test_df[test_df['direction'] == 'down']
    
    # Train UP
    print("\n--- UP MODEL ENSEMBLE ---")
    y_pred_up, up_xgb, up_cb = train_ensemble(
        train_up[features], train_up[target], test_up[features], "UP"
    )
    
    # Train DOWN
    print("\n--- DOWN MODEL ENSEMBLE ---")
    y_pred_down, down_xgb, down_cb = train_ensemble(
        train_down[features], train_down[target], test_down[features], "DOWN"
    )
    
    # Evaluate
    y_test_combined = np.concatenate([test_up[target].values, test_down[target].values])
    y_pred_combined = np.concatenate([y_pred_up, y_pred_down])
    
    mae = mean_absolute_error(y_test_combined, y_pred_combined)
    rmse = root_mean_squared_error(y_test_combined, y_pred_combined)
    mae_up = mean_absolute_error(test_up[target].values, y_pred_up)
    mae_down = mean_absolute_error(test_down[target].values, y_pred_down)
    
    print("\n" + "-" * 40)
    print(f"ENSEMBLE EVALUATION (Test Set - {len(y_test_combined)} bars):")
    print(f"Combined MAE: {mae:.2f}%  |  RMSE: {rmse:.2f}%")
    print(f"UP Model MAE: {mae_up:.2f}%  |  DOWN Model MAE: {mae_down:.2f}%")
    print("-" * 40)
    
    # Generate Predictions for all rows
    df['predicted_exhaustion'] = 0.0
    
    up_mask = df['direction'] == 'up'
    down_mask = df['direction'] == 'down'
    
    if up_mask.any():
        df.loc[up_mask, 'predicted_exhaustion'] = predict_ensemble(df.loc[up_mask, features], up_xgb, up_cb)
    if down_mask.any():
        df.loc[down_mask, 'predicted_exhaustion'] = predict_ensemble(df.loc[down_mask, features], down_xgb, down_cb)
    
    df['predicted_exhaustion'] = df['predicted_exhaustion'].clip(0, 100)
    
    comi_df = df[df['ticker'] == 'COMI']
    output_df = comi_df[['date', 'direction', 'predicted_exhaustion']]
    output_file = 'predictions_psi8.csv' if use_psi8 else 'predictions_psi40.csv'
    out_path = os.path.join(script_dir, output_file)
    output_df.to_csv(out_path, index=False)
    print(f"Saved {len(output_df)} predictions for COMI to {output_file}")

if __name__ == '__main__':
    main()
