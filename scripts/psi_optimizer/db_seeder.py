"""Database seeder for upserting winning PSI combinations into PostgreSQL."""

from __future__ import annotations
import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
import psycopg2
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def get_db_connection() -> Optional[psycopg2.extensions.connection]:
    """Establishes SSL connection to PostgreSQL from .env.local or .env."""
    load_dotenv(PROJECT_ROOT / ".env.local")
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        load_dotenv(PROJECT_ROOT / ".env")
        db_url = os.getenv("DATABASE_URL")

    if not db_url:
        print("Warning: DATABASE_URL not found in environment. Database seeding skipped.")
        return None

    try:
        conn = psycopg2.connect(db_url, sslmode="require")
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None


def get_valid_ticker_symbols(conn: psycopg2.extensions.connection) -> set[str]:
    """Fetches all valid ticker symbols from the tickers table."""
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT symbol FROM tickers;")
            rows = cur.fetchall()
            return {r[0].strip().upper() for r in rows if r[0]}
    except Exception as e:
        print(f"Error fetching ticker symbols: {e}")
        return set()


def seed_winning_combinations_to_db(winning_records: List[Dict[str, Any]]) -> int:
    """Upserts winning combinations into psi_combinations table."""
    conn = get_db_connection()
    if conn is None:
        return 0

    valid_symbols = get_valid_ticker_symbols(conn)
    if not valid_symbols:
        print("No tickers found in database tickers table.")
        conn.close()
        return 0

    upsert_query = """
    INSERT INTO psi_combinations (
        ticker_symbol,
        model,
        entry_levels,
        use_aym,
        aym_multiplier,
        aym_limit,
        use_atr,
        atr_distance,
        in_sample_roi_margin,
        in_sample_win_rate,
        in_sample_trades,
        out_of_sample_roi_margin,
        out_of_sample_win_rate,
        out_of_sample_trades,
        updated_at
    ) VALUES (
        %(ticker_symbol)s,
        %(model)s,
        %(entry_levels)s,
        %(use_aym)s,
        %(aym_multiplier)s,
        %(aym_limit)s,
        %(use_atr)s,
        %(atr_distance)s,
        %(in_sample_roi_margin)s,
        %(in_sample_win_rate)s,
        %(in_sample_trades)s,
        %(out_of_sample_roi_margin)s,
        %(out_of_sample_win_rate)s,
        %(out_of_sample_trades)s,
        NOW()
    )
    ON CONFLICT (ticker_symbol, model) DO UPDATE SET
        entry_levels = EXCLUDED.entry_levels,
        use_aym = EXCLUDED.use_aym,
        aym_multiplier = EXCLUDED.aym_multiplier,
        aym_limit = EXCLUDED.aym_limit,
        use_atr = EXCLUDED.use_atr,
        atr_distance = EXCLUDED.atr_distance,
        in_sample_roi_margin = EXCLUDED.in_sample_roi_margin,
        in_sample_win_rate = EXCLUDED.in_sample_win_rate,
        in_sample_trades = EXCLUDED.in_sample_trades,
        out_of_sample_roi_margin = EXCLUDED.out_of_sample_roi_margin,
        out_of_sample_win_rate = EXCLUDED.out_of_sample_win_rate,
        out_of_sample_trades = EXCLUDED.out_of_sample_trades,
        updated_at = NOW();
    """

    upserted_count = 0
    try:
        with conn.cursor() as cur:
            for rec in winning_records:
                sym = str(rec["ticker_symbol"]).strip().upper().replace(".CA", "")
                if sym not in valid_symbols:
                    # Attempt alternative lookup (e.g. GOLD -> GC1!, SILVER -> SI1!)
                    alt_sym = None
                    if sym in {"GC", "GC1", "XAUUSD", "GOLD", "GC1!"}:
                        if "GC1!" in valid_symbols:
                            alt_sym = "GC1!"
                        elif "GOLD" in valid_symbols:
                            alt_sym = "GOLD"
                    elif sym in {"SI", "SI1", "XAGUSD", "SILVER", "SI1!"}:
                        if "SI1!" in valid_symbols:
                            alt_sym = "SI1!"
                        elif "SILVER" in valid_symbols:
                            alt_sym = "SILVER"
                    elif sym in {"USDEGP", "USD/EGP", "USD-EGP"} and "USDEGP" in valid_symbols:
                        alt_sym = "USDEGP"

                    if alt_sym:
                        sym = alt_sym
                    else:
                        print(f"Skipping {sym}: not in DB tickers table.")
                        continue

                levels_json = json.dumps(rec["entry_levels"])

                params = {
                    "ticker_symbol": sym,
                    "model": rec.get("model", "psi8"),
                    "entry_levels": levels_json,
                    "use_aym": rec["use_aym"],
                    "aym_multiplier": rec["aym_multiplier"],
                    "aym_limit": rec["aym_limit"],
                    "use_atr": rec["use_atr"],
                    "atr_distance": rec["atr_distance"],
                    "in_sample_roi_margin": rec.get("in_sample_roi_margin"),
                    "in_sample_win_rate": rec.get("in_sample_win_rate"),
                    "in_sample_trades": rec.get("in_sample_trades"),
                    "out_of_sample_roi_margin": rec.get("out_of_sample_roi_margin"),
                    "out_of_sample_win_rate": rec.get("out_of_sample_win_rate"),
                    "out_of_sample_trades": rec.get("out_of_sample_trades"),
                }

                cur.execute(upsert_query, params)
                upserted_count += 1

            conn.commit()
            print(f"Successfully upserted {upserted_count} winning combinations into psi_combinations table.")
    except Exception as e:
        conn.rollback()
        print(f"Error seeding database: {e}")
    finally:
        conn.close()

    return upserted_count
