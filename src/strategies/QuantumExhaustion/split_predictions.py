import pandas as pd
import os
import json

CSV_PATH = r"C:\Users\abdelrahman.mamdouh_\Desktop\Trading\_technical_support\ml\predictions_psi40.csv"
OUT_DIR = r"C:\Users\abdelrahman.mamdouh_\Desktop\Trading\src\_data\qe_predictions"

os.makedirs(OUT_DIR, exist_ok=True)

print("Loading predictions...")
df = pd.read_csv(CSV_PATH)

# We want to group by ticker and save a JSON array of dicts for each
# Format: { date: "YYYY-MM-DD", direction: "up|down", prediction: 75.4 }
# Drop unnecessary columns if they exist (we just need date, ticker, direction, prediction_finetuned)

print(f"Splitting {len(df)} rows into individual ticker JSON files...")

tickers = df['ticker'].unique()
count = 0

for ticker in tickers:
    ticker_df = df[df['ticker'] == ticker].sort_values('date')
    
    # Construct a list of records
    records = []
    for _, row in ticker_df.iterrows():
        records.append({
            "date": row['date'],
            "direction": row['direction'],
            "prediction": round(float(row['prediction_finetuned']), 2)
        })
        
    out_path = os.path.join(OUT_DIR, f"{ticker}.json")
    with open(out_path, 'w') as f:
        json.dump(records, f)
        
    count += 1
    if count % 50 == 0:
        print(f"  Processed {count}/{len(tickers)} tickers")

print(f"Done! Saved {count} JSON files to {OUT_DIR}")
