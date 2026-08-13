import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import os
import copy
from tqdm import tqdm

# Hyperparameters
SEQ_LEN = 20
BATCH_SIZE = 4096  # We can use a large batch size for autoencoders
EPOCHS = 3         # We'll use 3 epochs to be fast on CPU
LR = 0.001
LATENT_DIM = 8

class RawSequenceDataset(Dataset):
    def __init__(self, df, seq_len=20):
        self.seq_len = seq_len
        self.valid_starts = []
        
        # We only need the raw features: open, high, low, close, volume
        self.X_raw = df[['open', 'high', 'low', 'close', 'volume']].values.astype(np.float32)
        self.metadata = df[['ticker', 'date']].values
        
        print(f"Building raw sequences (length {seq_len})...")
        grouped = df.groupby('ticker')
        
        for ticker, group in grouped:
            indices = group.index.values
            if len(indices) < seq_len:
                continue
                
            for i in range(len(indices) - seq_len + 1):
                self.valid_starts.append(indices[i])
                
    def __len__(self):
        return len(self.valid_starts)
        
    def __getitem__(self, idx):
        start_idx = self.valid_starts[idx]
        end_idx = start_idx + self.seq_len
        
        seq_x = self.X_raw[start_idx : end_idx].copy()
        
        # Intra-sequence normalization for shape learning
        # Price norm: (Price - initial_open) / initial_open
        initial_open = seq_x[0, 0]
        if initial_open == 0 or np.isnan(initial_open):
            initial_open = 1.0 # prevent div by zero
            
        for i in range(4): # 0=open, 1=high, 2=low, 3=close
            seq_x[:, i] = (seq_x[:, i] - initial_open) / initial_open
            
        # Volume norm: vol / mean(vol)
        vol_mean = np.mean(seq_x[:, 4])
        if vol_mean > 0:
            seq_x[:, 4] = seq_x[:, 4] / vol_mean
        else:
            seq_x[:, 4] = 0.0
            
        # Return sequence and the index so we can map latents back
        return torch.tensor(seq_x, dtype=torch.float32), start_idx

class AutoencoderConv1D(nn.Module):
    def __init__(self, num_features=5, latent_dim=8, seq_len=20):
        super(AutoencoderConv1D, self).__init__()
        self.seq_len = seq_len
        
        # ENCODER
        self.enc_conv1 = nn.Conv1d(in_channels=num_features, out_channels=32, kernel_size=3, padding=1)
        self.enc_relu1 = nn.ReLU()
        self.enc_conv2 = nn.Conv1d(in_channels=32, out_channels=64, kernel_size=3, padding=1)
        self.enc_relu2 = nn.ReLU()
        
        # Flatten and bottleneck
        self.enc_flatten_dim = 64 * seq_len
        self.bottleneck = nn.Linear(self.enc_flatten_dim, latent_dim)
        
        # DECODER
        self.dec_fc = nn.Linear(latent_dim, self.enc_flatten_dim)
        self.dec_relu = nn.ReLU()
        
        self.dec_conv1 = nn.Conv1d(in_channels=64, out_channels=32, kernel_size=3, padding=1)
        self.dec_relu1 = nn.ReLU()
        self.dec_conv2 = nn.Conv1d(in_channels=32, out_channels=num_features, kernel_size=3, padding=1)
        
    def encode(self, x):
        # x is (Batch, SeqLen, Features)
        x = x.permute(0, 2, 1) # (Batch, Features, SeqLen)
        
        x = self.enc_conv1(x)
        x = self.enc_relu1(x)
        
        x = self.enc_conv2(x)
        x = self.enc_relu2(x)
        
        x = x.reshape(x.size(0), -1) # Flatten
        latent = self.bottleneck(x)
        return latent
        
    def decode(self, latent):
        x = self.dec_fc(latent)
        x = self.dec_relu(x)
        
        x = x.view(x.size(0), 64, self.seq_len) # Reshape back to (Batch, 64, SeqLen)
        
        x = self.dec_conv1(x)
        x = self.dec_relu1(x)
        
        x = self.dec_conv2(x)
        
        x = x.permute(0, 2, 1) # Back to (Batch, SeqLen, Features)
        return x
        
    def forward(self, x):
        latent = self.encode(x)
        reconstructed = self.decode(latent)
        return reconstructed

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(script_dir, '..', '..', '_data', 'consolidated_prices_new.csv')
    
    if not os.path.exists(dataset_path):
        print(f"Error: {dataset_path} not found.")
        return
        
    print("Loading data...")
    df = pd.read_csv(dataset_path)
    df = df.rename(columns={'ticker_symbol': 'ticker'})
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values(['ticker', 'date']).reset_index(drop=True)
    
    # We want to train on everything to get a universal representation
    dataset = RawSequenceDataset(df, seq_len=SEQ_LEN)
    loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)
    
    device = torch.device('cpu') # Enforce CPU due to CUDA hang issue
    print(f"\nUsing device: {device}")
    
    model = AutoencoderConv1D(num_features=5, latent_dim=LATENT_DIM, seq_len=SEQ_LEN).to(device)
    criterion = nn.MSELoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=LR)
    
    print("\nTraining Autoencoder...")
    for epoch in range(EPOCHS):
        model.train()
        train_loss = 0.0
        
        # Add tqdm for a progress bar
        pbar = tqdm(loader, desc=f"Epoch {epoch+1}/{EPOCHS}")
        for inputs, _ in pbar:
            inputs = inputs.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, inputs) # Reconstruction loss
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item() * inputs.size(0)
            pbar.set_postfix({'loss': f"{loss.item():.4f}"})
            
        epoch_loss = train_loss / len(dataset)
        print(f"Epoch {epoch+1} Complete | Avg MSE Loss: {epoch_loss:.6f}")
        
    # Extraction Phase
    print("\nExtracting Latent Features for all sequences...")
    model.eval()
    
    # We need a sequential loader (shuffle=False) to extract perfectly
    extract_loader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=False)
    
    latent_records = []
    
    with torch.no_grad():
        for inputs, start_indices in tqdm(extract_loader, desc="Extracting"):
            inputs = inputs.to(device)
            latents = model.encode(inputs).cpu().numpy()
            start_indices = start_indices.numpy()
            
            for i in range(len(start_indices)):
                start_idx = start_indices[i]
                end_idx = start_idx + SEQ_LEN - 1 # The bar where the sequence completes
                
                ticker = dataset.metadata[end_idx][0]
                date = dataset.metadata[end_idx][1].strftime('%Y-%m-%d') if hasattr(dataset.metadata[end_idx][1], 'strftime') else str(dataset.metadata[end_idx][1]).split('T')[0]
                
                rec = [ticker, date] + latents[i].tolist()
                latent_records.append(rec)
                
    # Save Latents
    latent_cols = ['ticker', 'date'] + [f'latent_{i}' for i in range(LATENT_DIM)]
    latent_df = pd.DataFrame(latent_records, columns=latent_cols)
    
    out_path = os.path.join(script_dir, 'autoencoder_latents.csv')
    latent_df.to_csv(out_path, index=False)
    print(f"\nSuccessfully saved {len(latent_df)} latent vectors to {out_path}!")

if __name__ == '__main__':
    main()
