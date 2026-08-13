import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
import os
import copy

# Hyperparameters
SEQ_LEN = 20
BATCH_SIZE = 128  # Smaller batch size for fine-tuning
EPOCHS = 10       # More epochs since dataset is small
LR = 0.0001       # Lower LR for fine-tuning
TICKER = 'COMI'

class SwingSequenceDataset(Dataset):
    def __init__(self, df, features, target, seq_len=20, scaler=None, is_train=True):
        self.seq_len = seq_len
        self.valid_starts = []
        
        X_raw = df[features].values
        if is_train:
            self.scaler = StandardScaler()
            self.X = self.scaler.fit_transform(X_raw)
        else:
            self.scaler = scaler
            self.X = self.scaler.transform(X_raw)
            
        self.y = df[target].values
        
        for i in range(len(df.index.values) - seq_len + 1):
            self.valid_starts.append(i)
                
    def __len__(self):
        return len(self.valid_starts)
        
    def __getitem__(self, idx):
        start_idx = self.valid_starts[idx]
        end_idx = start_idx + self.seq_len
        
        seq_x = self.X[start_idx : end_idx]
        seq_y = self.y[end_idx - 1]
        
        return torch.tensor(seq_x, dtype=torch.float32), torch.tensor([seq_y], dtype=torch.float32)

class Conv1DModel(nn.Module):
    def __init__(self, num_features):
        super(Conv1DModel, self).__init__()
        self.conv1 = nn.Conv1d(in_channels=num_features, out_channels=64, kernel_size=3, padding=1)
        self.relu1 = nn.ReLU()
        self.bn1 = nn.BatchNorm1d(64)
        
        self.conv2 = nn.Conv1d(in_channels=64, out_channels=128, kernel_size=3, padding=1)
        self.relu2 = nn.ReLU()
        self.bn2 = nn.BatchNorm1d(128)
        
        self.conv3 = nn.Conv1d(in_channels=128, out_channels=256, kernel_size=3, padding=1)
        self.relu3 = nn.ReLU()
        self.bn3 = nn.BatchNorm1d(256)
        
        self.global_pool = nn.AdaptiveAvgPool1d(1)
        
        self.fc1 = nn.Linear(256, 64)
        self.relu4 = nn.ReLU()
        self.dropout = nn.Dropout(0.2)
        self.fc2 = nn.Linear(64, 1)
        
    def forward(self, x):
        x = x.permute(0, 2, 1)
        
        x = self.conv1(x)
        x = self.bn1(x)
        x = self.relu1(x)
        
        x = self.conv2(x)
        x = self.bn2(x)
        x = self.relu2(x)
        
        x = self.conv3(x)
        x = self.bn3(x)
        x = self.relu3(x)
        
        x = self.global_pool(x).squeeze(2)
        
        x = self.fc1(x)
        x = self.relu4(x)
        x = self.dropout(x)
        x = self.fc2(x)
        return x

def evaluate(model, dataloader, device):
    model.eval()
    y_pred, y_true = [], []
    with torch.no_grad():
        for inputs, targets in dataloader:
            inputs = inputs.to(device)
            preds = model(inputs).cpu().numpy()
            y_pred.extend(preds)
            y_true.extend(targets.numpy())
            
    y_pred = np.clip(np.array(y_pred).flatten(), 0, 100)
    y_true = np.array(y_true).flatten()
    mae = mean_absolute_error(y_true, y_pred)
    return mae, y_pred, y_true

def train_finetune(model, train_loader, val_loader, device, model_name="Model"):
    criterion = nn.L1Loss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=1e-4)
    
    best_val_loss = float('inf')
    best_model_wts = copy.deepcopy(model.state_dict())
    
    print(f"\nFine-Tuning {model_name} on {device}...")
    for epoch in range(EPOCHS):
        model.train()
        train_loss = 0.0
        
        for batch_idx, (inputs, targets) in enumerate(train_loader):
            inputs, targets = inputs.to(device), targets.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, targets)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item() * inputs.size(0)
            
        train_loss = train_loss / len(train_loader.dataset)
        val_mae, _, _ = evaluate(model, val_loader, device)
        
        print(f"  Epoch {epoch+1}/{EPOCHS} | Train MAE: {train_loss:.2f}% | Val MAE: {val_mae:.2f}%")
        
        if val_mae < best_val_loss:
            best_val_loss = val_mae
            best_model_wts = copy.deepcopy(model.state_dict())
            
    model.load_state_dict(best_model_wts)
    return model

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(script_dir, 'dataset_psi40.csv')
    
    print(f"Loading data for fine-tuning {TICKER}...")
    df = pd.read_csv(dataset_path)
    df['date'] = pd.to_datetime(df['date'])
    df = df[df['ticker'] == TICKER].sort_values('date').reset_index(drop=True)
    
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
    
    train_df = df[df['date'] <= '2024-12-31']
    test_df = df[df['date'] >= '2025-01-01']
    
    train_up = train_df[train_df['direction'] == 'up'].reset_index(drop=True)
    train_down = train_df[train_df['direction'] == 'down'].reset_index(drop=True)
    test_up = test_df[test_df['direction'] == 'up'].reset_index(drop=True)
    test_down = test_df[test_df['direction'] == 'down'].reset_index(drop=True)
    
    print(f"Train UP: {len(train_up)} | Train DOWN: {len(train_down)}")
    print(f"Test UP: {len(test_up)} | Test DOWN: {len(test_down)}")
    
    # Build UP Datasets
    up_train_dataset = SwingSequenceDataset(train_up, features, target, seq_len=SEQ_LEN, is_train=True)
    up_test_dataset = SwingSequenceDataset(test_up, features, target, seq_len=SEQ_LEN, scaler=up_train_dataset.scaler, is_train=False)
    
    # Build DOWN Datasets
    down_train_dataset = SwingSequenceDataset(train_down, features, target, seq_len=SEQ_LEN, is_train=True)
    down_test_dataset = SwingSequenceDataset(test_down, features, target, seq_len=SEQ_LEN, scaler=down_train_dataset.scaler, is_train=False)
    
    # DataLoaders
    up_train_loader = DataLoader(up_train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    up_test_loader = DataLoader(up_test_dataset, batch_size=BATCH_SIZE, shuffle=False)
    
    down_train_loader = DataLoader(down_train_dataset, batch_size=BATCH_SIZE, shuffle=True)
    down_test_loader = DataLoader(down_test_dataset, batch_size=BATCH_SIZE, shuffle=False)
    
    device = torch.device('cpu')
    print(f"\nUsing device: {device}")
    
    # Init Models & Load Pre-Trained Weights
    model_up = Conv1DModel(num_features=len(features)).to(device)
    model_down = Conv1DModel(num_features=len(features)).to(device)
    
    up_model_path = os.path.join(script_dir, 'cnn_up_psi40.pt')
    down_model_path = os.path.join(script_dir, 'cnn_down_psi40.pt')
    
    if os.path.exists(up_model_path) and os.path.exists(down_model_path):
        model_up.load_state_dict(torch.load(up_model_path, map_location=device))
        model_down.load_state_dict(torch.load(down_model_path, map_location=device))
        print("Successfully loaded pre-trained global weights!")
    else:
        print("WARNING: Pre-trained weights not found. Training from scratch.")
        
    # --- ZERO-SHOT EVALUATION ---
    print("\n--- ZERO-SHOT PERFORMANCE (Before Fine-Tuning) ---")
    zs_mae_up, zs_pred_up, zs_true_up = evaluate(model_up, up_test_loader, device)
    zs_mae_down, zs_pred_down, zs_true_down = evaluate(model_down, down_test_loader, device)
    
    zs_true_comb = np.concatenate([zs_true_up, zs_true_down])
    zs_pred_comb = np.concatenate([zs_pred_up, zs_pred_down])
    zs_mae_comb = mean_absolute_error(zs_true_comb, zs_pred_comb)
    print(f"Combined MAE: {zs_mae_comb:.2f}%")
    print(f"UP Model MAE: {zs_mae_up:.2f}%  |  DOWN Model MAE: {zs_mae_down:.2f}%")
    
    # --- FINE-TUNING ---
    model_up = train_finetune(model_up, up_train_loader, up_test_loader, device, "UP Model")
    model_down = train_finetune(model_down, down_train_loader, down_test_loader, device, "DOWN Model")
    
    # --- FINE-TUNED EVALUATION ---
    print("\n--- FINE-TUNED PERFORMANCE (After Fine-Tuning) ---")
    ft_mae_up, ft_pred_up, ft_true_up = evaluate(model_up, up_test_loader, device)
    ft_mae_down, ft_pred_down, ft_true_down = evaluate(model_down, down_test_loader, device)
    
    ft_true_comb = np.concatenate([ft_true_up, ft_true_down])
    ft_pred_comb = np.concatenate([ft_pred_up, ft_pred_down])
    ft_mae_comb = mean_absolute_error(ft_true_comb, ft_pred_comb)
    print(f"Combined MAE: {ft_mae_comb:.2f}%")
    print(f"UP Model MAE: {ft_mae_up:.2f}%  |  DOWN Model MAE: {ft_mae_down:.2f}%")
    
    # Save Fine-Tuned Predictions for Charting
    print("\nSaving Fine-Tuned predictions...")
    
    full_up = df[df['direction'] == 'up'].reset_index(drop=True)
    full_down = df[df['direction'] == 'down'].reset_index(drop=True)
    
    full_up_dataset = SwingSequenceDataset(full_up, features, target, seq_len=SEQ_LEN, scaler=up_train_dataset.scaler, is_train=False)
    full_down_dataset = SwingSequenceDataset(full_down, features, target, seq_len=SEQ_LEN, scaler=down_train_dataset.scaler, is_train=False)
    
    full_up_loader = DataLoader(full_up_dataset, batch_size=BATCH_SIZE, shuffle=False)
    full_down_loader = DataLoader(full_down_dataset, batch_size=BATCH_SIZE, shuffle=False)
    
    _, up_preds, _ = evaluate(model_up, full_up_loader, device)
    _, down_preds, _ = evaluate(model_down, full_down_loader, device)
    
    full_up['prediction_finetuned'] = 0.0
    for i, start_idx in enumerate(full_up_dataset.valid_starts):
        end_idx = start_idx + SEQ_LEN - 1
        full_up.at[end_idx, 'prediction_finetuned'] = up_preds[i]
        
    full_down['prediction_finetuned'] = 0.0
    for i, start_idx in enumerate(full_down_dataset.valid_starts):
        end_idx = start_idx + SEQ_LEN - 1
        full_down.at[end_idx, 'prediction_finetuned'] = down_preds[i]
        
    final_df = pd.concat([full_up, full_down]).sort_values('date')
    
    output_df = final_df[['date', 'direction', 'prediction_finetuned']]
    
    out_path = os.path.join(script_dir, 'predictions_finetuned.csv')
    
    # merge with existing predictions_psi40.csv if it exists
    base_preds_path = os.path.join(script_dir, 'predictions_psi40.csv')
    if os.path.exists(base_preds_path):
        base_df = pd.read_csv(base_preds_path)
        base_df['date'] = pd.to_datetime(base_df['date'])
        base_df = base_df.merge(output_df, on=['date', 'direction'], how='left')
        base_df.to_csv(base_preds_path, index=False)
        print(f"Merged Fine-Tuned predictions into {base_preds_path}")
    else:
        output_df.to_csv(out_path, index=False)
        print(f"Saved to {out_path}")

if __name__ == '__main__':
    main()
