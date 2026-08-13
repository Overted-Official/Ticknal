"""
Quantum Exhaustion (QE) Strategy — Master Fine-Tuning Script
============================================================
Loops over every ticker in dataset_psi40.csv and fine-tunes the global
1D-CNN model on each ticker's specific history.

Usage:
  python finetune_all_tickers.py               # fine-tune all 293 tickers
  python finetune_all_tickers.py --test-run    # test-run (first 3 tickers only)

Output:
  predictions_psi40.csv is updated in-place with a 'prediction_finetuned'
  column for every ticker. This file is the single source of truth for the
  QuantEGX charting UI.
"""

import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error
import os
import copy
import argparse
import time

# ─────────────────────────────────────────────
# Hyperparameters
# ─────────────────────────────────────────────
SEQ_LEN    = 20
BATCH_SIZE = 64
EPOCHS     = 10
LR         = 0.0001
TRAIN_CUTOFF = '2024-12-31'
TEST_CUTOFF  = '2025-01-01'

# Minimum bars a ticker must have to be fine-tuned (skip tickers with too little data)
MIN_TRAIN_BARS = 100

FEATURES = [
    'delta_to_red', 'delta_to_green', 'momentum', 'curr_is_bullish',
    'last_red_is_bullish', 'last_green_is_bullish',
    'bars_since_red', 'bars_since_green',
    'swing_roi_up', 'swing_roi_down',
    'roi_median_multiple_up', 'roi_median_multiple_down',
    'delta_to_red_lag5', 'momentum_lag5', 'delta_velocity',
    'psi_index_value',
    'volume_ratio', 'cumulative_volume_ratio',
    'latent_0', 'latent_1', 'latent_2', 'latent_3',
    'latent_4', 'latent_5', 'latent_6', 'latent_7',
]
TARGET = 'target_exhaustion'


# ─────────────────────────────────────────────
# Dataset
# ─────────────────────────────────────────────
class SwingSequenceDataset(Dataset):
    def __init__(self, df, features, target, seq_len=20, scaler=None, is_train=True):
        self.seq_len = seq_len
        X_raw = df[features].values
        if is_train:
            self.scaler = StandardScaler()
            self.X = self.scaler.fit_transform(X_raw)
        else:
            self.scaler = scaler
            self.X = self.scaler.transform(X_raw)
        self.y = df[target].values
        self.valid_starts = list(range(len(df) - seq_len + 1))

    def __len__(self):
        return len(self.valid_starts)

    def __getitem__(self, idx):
        start = self.valid_starts[idx]
        end   = start + self.seq_len
        return (
            torch.tensor(self.X[start:end], dtype=torch.float32),
            torch.tensor([self.y[end - 1]], dtype=torch.float32),
        )


# ─────────────────────────────────────────────
# Model Architecture (must match train_pytorch.py)
# ─────────────────────────────────────────────
class Conv1DModel(nn.Module):
    def __init__(self, num_features):
        super().__init__()
        self.conv1 = nn.Conv1d(num_features,  64, kernel_size=3, padding=1)
        self.bn1   = nn.BatchNorm1d(64)
        self.relu1 = nn.ReLU()
        self.conv2 = nn.Conv1d(64,  128, kernel_size=3, padding=1)
        self.bn2   = nn.BatchNorm1d(128)
        self.relu2 = nn.ReLU()
        self.conv3 = nn.Conv1d(128, 256, kernel_size=3, padding=1)
        self.bn3   = nn.BatchNorm1d(256)
        self.relu3 = nn.ReLU()
        self.global_pool = nn.AdaptiveAvgPool1d(1)
        self.fc1     = nn.Linear(256, 64)
        self.relu4   = nn.ReLU()
        self.dropout = nn.Dropout(0.2)
        self.fc2     = nn.Linear(64, 1)

    def forward(self, x):
        x = x.permute(0, 2, 1)
        x = self.relu1(self.bn1(self.conv1(x)))
        x = self.relu2(self.bn2(self.conv2(x)))
        x = self.relu3(self.bn3(self.conv3(x)))
        x = self.global_pool(x).squeeze(2)
        x = self.dropout(self.relu4(self.fc1(x)))
        return self.fc2(x)


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
def load_global_weights(model_up, model_down, script_dir, device):
    up_path   = os.path.join(script_dir, 'cnn_up_psi40.pt')
    down_path = os.path.join(script_dir, 'cnn_down_psi40.pt')
    if not os.path.exists(up_path) or not os.path.exists(down_path):
        raise FileNotFoundError(
            "Global weights not found. Please run train_pytorch.py first."
        )
    model_up.load_state_dict(
        torch.load(up_path,   map_location=device, weights_only=False)
    )
    model_down.load_state_dict(
        torch.load(down_path, map_location=device, weights_only=False)
    )


def evaluate(model, loader, device):
    model.eval()
    preds, trues = [], []
    with torch.no_grad():
        for X, y in loader:
            out = model(X.to(device)).cpu().numpy()
            preds.extend(out)
            trues.extend(y.numpy())
    preds = np.clip(np.array(preds).flatten(), 0, 100)
    trues = np.array(trues).flatten()
    return mean_absolute_error(trues, preds), preds, trues


def finetune_model(model, train_loader, val_loader, device):
    criterion = nn.L1Loss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=1e-4)
    best_val  = float('inf')
    best_wts  = copy.deepcopy(model.state_dict())

    for epoch in range(EPOCHS):
        model.train()
        total_loss = 0.0
        for X, y in train_loader:
            X, y = X.to(device), y.to(device)
            optimizer.zero_grad()
            loss = criterion(model(X), y)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * X.size(0)

        val_mae, _, _ = evaluate(model, val_loader, device)
        if val_mae < best_val:
            best_val = val_mae
            best_wts = copy.deepcopy(model.state_dict())

    model.load_state_dict(best_wts)
    return model, best_val


def build_loaders(ticker_df, direction, train_cutoff, test_cutoff):
    sub = ticker_df[ticker_df['direction'] == direction].reset_index(drop=True)
    train = sub[sub['date'] <= train_cutoff].reset_index(drop=True)
    test  = sub[sub['date'] >= test_cutoff ].reset_index(drop=True)

    if len(train) < SEQ_LEN + 1 or len(test) < SEQ_LEN + 1:
        return None, None, None, None, None

    train_ds = SwingSequenceDataset(train, FEATURES, TARGET, SEQ_LEN, is_train=True)
    test_ds  = SwingSequenceDataset(test,  FEATURES, TARGET, SEQ_LEN,
                                    scaler=train_ds.scaler, is_train=False)

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)
    test_loader  = DataLoader(test_ds,  batch_size=BATCH_SIZE, shuffle=False)
    return train_loader, test_loader, train_ds.scaler, sub, train_ds


def get_full_predictions(model, full_sub, train_scaler, device):
    """Generate predictions for the entire ticker history for charting."""
    full_ds = SwingSequenceDataset(
        full_sub, FEATURES, TARGET, SEQ_LEN,
        scaler=train_scaler, is_train=False
    )
    loader = DataLoader(full_ds, batch_size=BATCH_SIZE, shuffle=False)
    _, preds, _ = evaluate(model, loader, device)

    pred_col = np.zeros(len(full_sub))
    for i, start in enumerate(full_ds.valid_starts):
        pred_col[start + SEQ_LEN - 1] = preds[i]
    return pred_col, full_ds


# ─────────────────────────────────────────────
# Main Loop
# ─────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description='QE — Fine-tune all tickers')
    parser.add_argument('--test-run', action='store_true',
                        help='Only fine-tune the first 3 tickers (for testing)')
    args = parser.parse_args()

    script_dir   = os.path.dirname(os.path.abspath(__file__))
    # Large data files stay in _technical_support/ml/ — resolve from project root
    project_root = os.path.abspath(os.path.join(script_dir, '..', '..', '..', '_technical_support', 'ml'))
    dataset_path = os.path.join(project_root, 'dataset_psi40.csv')
    preds_path   = os.path.join(project_root, 'predictions_psi40.csv')
    # Model weights live alongside this script
    weights_dir  = script_dir

    print("=" * 60)
    print("  Quantum Exhaustion (QE) - Master Fine-Tuning Pipeline")
    print("=" * 60)

    # ── Load full dataset ──
    print("\nLoading dataset...")
    df = pd.read_csv(dataset_path)
    df['date'] = pd.to_datetime(df['date'])

    tickers = sorted(df['ticker'].unique().tolist())
    total   = len(tickers)
    print(f"[OK] {total} unique tickers found in dataset.")

    if args.test_run:
        tickers = tickers[:3]
        print(f"[TEST RUN] Only processing: {tickers}")

    device = torch.device('cpu')
    print(f"Device: {device}\n")

    # ── Build a fresh ticker-aware master predictions DataFrame ──
    # The old predictions_psi40.csv only covered COMI and lacked a 'ticker' column.
    # We always start fresh here and populate it per-ticker.
    master_rows = []  # will accumulate dicts: {date, ticker, direction, prediction_finetuned}

    # ── Fine-tune loop ──
    results_log = []
    start_time  = time.time()

    for idx, ticker in enumerate(tickers):
        ticker_start = time.time()
        print(f"[{idx+1}/{len(tickers)}] Fine-tuning: {ticker}")

        ticker_df = df[df['ticker'] == ticker].copy().sort_values('date').reset_index(drop=True)

        # ── Build UP loaders ──
        up_train_loader, up_test_loader, up_scaler, up_full, up_train_ds = \
            build_loaders(ticker_df, 'up', TRAIN_CUTOFF, TEST_CUTOFF)

        # ── Build DOWN loaders ──
        dn_train_loader, dn_test_loader, dn_scaler, dn_full, dn_train_ds = \
            build_loaders(ticker_df, 'down', TRAIN_CUTOFF, TEST_CUTOFF)

        if up_train_loader is None and dn_train_loader is None:
            print(f"    Skipping {ticker} - insufficient data.")
            results_log.append({'ticker': ticker, 'status': 'skipped', 'up_mae': None, 'down_mae': None})
            continue

        # ── Load fresh copy of global weights for each ticker ──
        model_up   = Conv1DModel(num_features=len(FEATURES)).to(device)
        model_down = Conv1DModel(num_features=len(FEATURES)).to(device)
        load_global_weights(model_up, model_down, weights_dir, device)

        up_best_val, dn_best_val = None, None

        # ── Fine-tune UP ──
        if up_train_loader is not None:
            model_up, up_best_val = finetune_model(model_up, up_train_loader, up_test_loader, device)

        # ── Fine-tune DOWN ──
        if dn_train_loader is not None:
            model_down, dn_best_val = finetune_model(model_down, dn_train_loader, dn_test_loader, device)

        # ── Generate full-history predictions ──
        new_rows = []
        if up_full is not None and up_scaler is not None:
            up_preds, _ = get_full_predictions(model_up, up_full, up_scaler, device)
            for i, row in up_full.iterrows():
                new_rows.append({
                    'date': row['date'],
                    'ticker': ticker,
                    'direction': 'up',
                    'prediction_finetuned': up_preds[i],
                })

        if dn_full is not None and dn_scaler is not None:
            dn_preds, _ = get_full_predictions(model_down, dn_full, dn_scaler, device)
            for i, row in dn_full.iterrows():
                new_rows.append({
                    'date': row['date'],
                    'ticker': ticker,
                    'direction': 'down',
                    'prediction_finetuned': dn_preds[i],
                })

        # ── Accumulate into master rows list ──
        if new_rows:
            master_rows.extend(new_rows)

        elapsed = time.time() - ticker_start
        up_str  = f"{up_best_val:.2f}%" if up_best_val  is not None else "N/A"
        dn_str  = f"{dn_best_val:.2f}%" if dn_best_val is not None else "N/A"
        print(f"    Done in {elapsed:.1f}s  |  Best Val MAE - UP: {up_str}  DOWN: {dn_str}")
        results_log.append({'ticker': ticker, 'status': 'ok', 'up_mae': up_best_val, 'down_mae': dn_best_val})

    # ── Save master predictions CSV ──
    master_df = pd.DataFrame(master_rows)
    if not master_df.empty:
        master_df['date'] = pd.to_datetime(master_df['date'])
        master_df.sort_values(['ticker', 'date']).to_csv(preds_path, index=False)
    else:
        print("WARNING: No predictions generated — CSV not saved.")
    total_elapsed = time.time() - start_time

    # ── Summary Report ──
    print("\n" + "=" * 60)
    print("  QE Fine-Tuning Complete!")
    print("=" * 60)
    done    = [r for r in results_log if r['status'] == 'ok']
    skipped = [r for r in results_log if r['status'] == 'skipped']
    print(f"  Fine-tuned : {len(done)} tickers")
    print(f"  Skipped    : {len(skipped)} tickers (too little data)")
    print(f"  Total time : {total_elapsed/60:.1f} minutes")
    print(f"  Saved      : {preds_path}")
    print("=" * 60)

    if done:
        up_maes   = [r['up_mae']   for r in done if r['up_mae']   is not None]
        down_maes = [r['down_mae'] for r in done if r['down_mae'] is not None]
        if up_maes:
            print(f"\n  Avg UP   Val MAE across all tickers: {np.mean(up_maes):.2f}%")
        if down_maes:
            print(f"  Avg DOWN Val MAE across all tickers: {np.mean(down_maes):.2f}%")


if __name__ == '__main__':
    main()
