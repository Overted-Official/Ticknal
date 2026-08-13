import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error
import sys
import os
import copy

# Hyperparameters
SEQ_LEN = 20
BATCH_SIZE = 1024
EPOCHS = 3
LR = 0.001

class SwingSequenceDataset(Dataset):
    def __init__(self, df, features, target, seq_len=20, scaler=None, is_train=True):
        self.seq_len = seq_len
        self.valid_starts = []
        
        # We need to normalize the features for Neural Networks
        X_raw = df[features].values
        if is_train:
            self.scaler = StandardScaler()
            self.X = self.scaler.fit_transform(X_raw)
        else:
            self.scaler = scaler
            self.X = self.scaler.transform(X_raw)
            
        self.y = df[target].values
        
        # Group by ticker to ensure we don't bleed sequences across different coins/stocks
        print(f"Building sequences (length {seq_len})...")
        grouped = df.groupby('ticker')
        
        for ticker, group in grouped:
            indices = group.index.values
            if len(indices) < seq_len:
                continue
                
            # Create sliding windows
            for i in range(len(indices) - seq_len + 1):
                self.valid_starts.append(indices[i])
                
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
        # Input shape: (Batch, Channels/Features, Length)
        
        self.conv1 = nn.Conv1d(in_channels=num_features, out_channels=64, kernel_size=3, padding=1)
        self.relu1 = nn.ReLU()
        self.bn1 = nn.BatchNorm1d(64)
        
        self.conv2 = nn.Conv1d(in_channels=64, out_channels=128, kernel_size=3, padding=1)
        self.relu2 = nn.ReLU()
        self.bn2 = nn.BatchNorm1d(128)
        
        self.conv3 = nn.Conv1d(in_channels=128, out_channels=256, kernel_size=3, padding=1)
        self.relu3 = nn.ReLU()
        self.bn3 = nn.BatchNorm1d(256)
        
        # Global Average Pooling flattens the sequence length dimension
        self.global_pool = nn.AdaptiveAvgPool1d(1)
        
        self.fc1 = nn.Linear(256, 64)
        self.relu4 = nn.ReLU()
        self.dropout = nn.Dropout(0.2)
        self.fc2 = nn.Linear(64, 1)
        
    def forward(self, x):
        # PyTorch Conv1D expects (Batch, Channels, SeqLen)
        # Our data is (Batch, SeqLen, Channels), so we permute
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
        
        x = self.global_pool(x).squeeze(2) # (Batch, 256)
        
        x = self.fc1(x)
        x = self.relu4(x)
        x = self.dropout(x)
        x = self.fc2(x)
        return x

def train_model(model, train_loader, val_loader, device, model_name="Model"):
    criterion = nn.L1Loss() # Directly optimize MAE!
    optimizer = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', patience=2, factor=0.5)
    
    best_val_loss = float('inf')
    best_model_wts = copy.deepcopy(model.state_dict())
    
    print(f"\nTraining {model_name} on {device}...")
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
            
            if (batch_idx + 1) % 50 == 0:
                print(f"    Epoch {epoch+1} | Batch {batch_idx+1}/{len(train_loader)} | Loss: {loss.item():.4f}")
                
        train_loss = train_loss / len(train_loader.dataset)
        
        # Validation
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for inputs, targets in val_loader:
                inputs, targets = inputs.to(device), targets.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, targets)
                val_loss += loss.item() * inputs.size(0)
                
        val_loss = val_loss / len(val_loader.dataset)
        scheduler.step(val_loss)
        
        print(f"  Epoch {epoch+1}/{EPOCHS} | Train MAE: {train_loss:.2f}% | Val MAE: {val_loss:.2f}%")
        
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_model_wts = copy.deepcopy(model.state_dict())
            
    model.load_state_dict(best_model_wts)
    return model

def main():
    use_psi8 = '--psi8' in sys.argv
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    input_file = 'dataset_psi8.csv' if use_psi8 else 'dataset_psi40.csv'
    dataset_path = os.path.join(script_dir, input_file)
    
    if not os.path.exists(dataset_path):
        print(f"Error: {dataset_path} not found.")
        return

    print("Loading data...")
    df = pd.read_csv(dataset_path)
    df['date'] = pd.to_datetime(df['date'])
    # Ensure strictly sorted by ticker and date for proper sequence windowing
    df = df.sort_values(['ticker', 'date']).reset_index(drop=True)
    
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
    
    print("\nPreparing PyTorch Datasets...")
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
    
    # Force CPU to avoid CUDA kernel hanging on this environment
    device = torch.device('cpu')
    print(f"\nUsing device: {device}")
    
    # Init Models
    model_up = Conv1DModel(num_features=len(features)).to(device)
    model_down = Conv1DModel(num_features=len(features)).to(device)
    
    # Train Models
    model_up = train_model(model_up, up_train_loader, up_test_loader, device, "UP Model")
    model_down = train_model(model_down, down_train_loader, down_test_loader, device, "DOWN Model")
    
    # Final Evaluation
    model_up.eval()
    model_down.eval()
    
    y_pred_up = []
    y_true_up = []
    with torch.no_grad():
        for inputs, targets in up_test_loader:
            inputs = inputs.to(device)
            preds = model_up(inputs).cpu().numpy()
            y_pred_up.extend(preds)
            y_true_up.extend(targets.numpy())
            
    y_pred_down = []
    y_true_down = []
    with torch.no_grad():
        for inputs, targets in down_test_loader:
            inputs = inputs.to(device)
            preds = model_down(inputs).cpu().numpy()
            y_pred_down.extend(preds)
            y_true_down.extend(targets.numpy())
            
    y_pred_up = np.clip(np.array(y_pred_up).flatten(), 0, 100)
    y_true_up = np.array(y_true_up).flatten()
    
    y_pred_down = np.clip(np.array(y_pred_down).flatten(), 0, 100)
    y_true_down = np.array(y_true_down).flatten()
    
    y_true_combined = np.concatenate([y_true_up, y_true_down])
    y_pred_combined = np.concatenate([y_pred_up, y_pred_down])
    
    from sklearn.metrics import root_mean_squared_error
    rmse = root_mean_squared_error(y_true_combined, y_pred_combined)
    mae = mean_absolute_error(y_true_combined, y_pred_combined)
    mae_up = mean_absolute_error(y_true_up, y_pred_up)
    mae_down = mean_absolute_error(y_true_down, y_pred_down)
    
    print("\n" + "="*50)
    print(f"DEEP LEARNING (1D-CNN) EVALUATION (Test Set)")
    print(f"Combined MAE: {mae:.2f}%  |  Combined RMSE: {rmse:.2f}%")
    print(f"UP Model MAE: {mae_up:.2f}%  |  DOWN Model MAE: {mae_down:.2f}%")
    print("="*50)

    # Generate Full Dataset Predictions for the Chart
    print("\nGenerating final predictions for chart plotting...")
    # Build a full dataset to predict on
    full_up = df[df['direction'] == 'up'].reset_index(drop=True)
    full_down = df[df['direction'] == 'down'].reset_index(drop=True)
    
    full_up_dataset = SwingSequenceDataset(full_up, features, target, seq_len=SEQ_LEN, scaler=up_train_dataset.scaler, is_train=False)
    full_down_dataset = SwingSequenceDataset(full_down, features, target, seq_len=SEQ_LEN, scaler=down_train_dataset.scaler, is_train=False)
    
    full_up_loader = DataLoader(full_up_dataset, batch_size=BATCH_SIZE, shuffle=False)
    full_down_loader = DataLoader(full_down_dataset, batch_size=BATCH_SIZE, shuffle=False)
    
    full_y_up = []
    with torch.no_grad():
        for inputs, _ in full_up_loader:
            inputs = inputs.to(device)
            preds = model_up(inputs).cpu().numpy()
            full_y_up.extend(preds)
            
    full_y_down = []
    with torch.no_grad():
        for inputs, _ in full_down_loader:
            inputs = inputs.to(device)
            preds = model_down(inputs).cpu().numpy()
            full_y_down.extend(preds)
            
    # Assign predictions back to the datasets (Note: the first SEQ_LEN-1 rows for each ticker have no prediction)
    # We will initialize the column with 0.0
    full_up['predicted_exhaustion'] = 0.0
    # The valid_starts in the dataset map perfectly to the sequences
    for i, start_idx in enumerate(full_up_dataset.valid_starts):
        end_idx = start_idx + SEQ_LEN - 1
        full_up.at[end_idx, 'predicted_exhaustion'] = full_y_up[i][0]
        
    full_down['predicted_exhaustion'] = 0.0
    for i, start_idx in enumerate(full_down_dataset.valid_starts):
        end_idx = start_idx + SEQ_LEN - 1
        full_down.at[end_idx, 'predicted_exhaustion'] = full_y_down[i][0]
        
    # Recombine and clip
    final_df = pd.concat([full_up, full_down]).sort_values(['ticker', 'date'])
    final_df['predicted_exhaustion'] = final_df['predicted_exhaustion'].clip(0, 100)
    
    print("\nSaving PyTorch models...")
    torch.save(model_up.state_dict(), os.path.join(script_dir, 'cnn_up_psi40.pt'))
    torch.save(model_down.state_dict(), os.path.join(script_dir, 'cnn_down_psi40.pt'))
    
    # Export COMI for Charting
    comi_df = final_df[final_df['ticker'] == 'COMI']
    output_df = comi_df[['date', 'direction', 'predicted_exhaustion']]
    output_file = 'predictions_psi8.csv' if use_psi8 else 'predictions_psi40.csv'
    out_path = os.path.join(script_dir, output_file)
    
    # If the file already exists (from ensemble), merge it
    if os.path.exists(out_path):
        base_df = pd.read_csv(out_path)
        base_df['date'] = pd.to_datetime(base_df['date'])
        base_df = base_df.merge(output_df, on=['date', 'direction'], how='left')
        base_df.to_csv(out_path, index=False)
    else:
        output_df.to_csv(out_path, index=False)
        
    print(f"Saved {len(output_df)} predictions for COMI to {output_file}")

if __name__ == '__main__':
    main()
