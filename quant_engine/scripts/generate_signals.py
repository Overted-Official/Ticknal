import argparse
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from features.builder import build_feature_matrix
from data.loader import load_price_data
from signals.generator import generate_signals
from signals.db_writer import write_signals_to_db
from config import HORIZONS

def main():
    parser = argparse.ArgumentParser(description="Generate QuantEGX Signals")
    parser.add_argument("--ticker", type=str, help="Specific ticker to generate for (defaults to all)")
    parser.add_argument("--dry-run", action="store_true", help="Don't write to DB, just print")
    args = parser.parse_args()

    print("--- Starting Signal Generation ---")
    
    # 1. Load Data
    price_df = load_price_data(args.ticker)
    if len(price_df) == 0:
        print("No data found!")
        return
        
    # We only need recent data for inference (e.g., last 200 bars to compute long moving averages)
    # Group by ticker and take last 250 rows
    recent_df = price_df.groupby('tickerSymbol').tail(250).reset_index(drop=True)

    # 2. Build Features
    print("Building features...")
    feature_df = build_feature_matrix(recent_df)
    
    # We only want to generate signals for the most recent day(s)
    # Take the last row for each ticker
    latest_features = feature_df.groupby('tickerSymbol').tail(1).reset_index(drop=True)

    # 3. Generate Signals
    print("Running inference...")
    try:
        signals_df = generate_signals(latest_features, HORIZONS)
    except FileNotFoundError as e:
        print(f"Error: {e}")
        return
        
    if args.dry_run:
        print(signals_df)
    else:
        # 4. Write to DB
        write_signals_to_db(signals_df)
    
    print("--- Signal Generation Complete ---")

if __name__ == "__main__":
    main()
