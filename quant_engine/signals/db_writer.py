import pandas as pd
from sqlalchemy import text
from data.loader import get_db_engine

def write_signals_to_db(signals_df: pd.DataFrame):
    """
    Upserts signals into the 'signals' table in Supabase.
    """
    engine = get_db_engine()
    
    # We use raw SQL with ON CONFLICT DO UPDATE for fast upserts
    upsert_sql = text("""
        INSERT INTO signals (
            ticker_symbol, date, signal, confidence, 
            prob_5d, prob_10d, prob_15d, prob_20d, prob_25d, 
            model_version
        ) VALUES (
            :tickerSymbol, :date, :signal, :confidence,
            :prob_5d, :prob_10d, :prob_15d, :prob_20d, :prob_25d,
            :model_version
        )
        ON CONFLICT (ticker_symbol, date) DO UPDATE SET
            signal = EXCLUDED.signal,
            confidence = EXCLUDED.confidence,
            prob_5d = EXCLUDED.prob_5d,
            prob_10d = EXCLUDED.prob_10d,
            prob_15d = EXCLUDED.prob_15d,
            prob_20d = EXCLUDED.prob_20d,
            prob_25d = EXCLUDED.prob_25d,
            model_version = EXCLUDED.model_version;
    """)
    
    print(f"Writing {len(signals_df)} signals to database...")
    
    records = signals_df.to_dict(orient='records')
    chunk_size = 5000
    
    with engine.begin() as conn:
        for i in range(0, len(records), chunk_size):
            chunk = records[i:i + chunk_size]
            conn.execute(upsert_sql, chunk)
            print(f"Wrote {min(i + chunk_size, len(records))}/{len(records)} signals...", end='\r')
            
    print("\nWrite complete.")
