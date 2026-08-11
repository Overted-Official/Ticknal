import os

# --- Horizons & Labels ---
HORIZONS = [5, 10, 15, 20, 25]

# Threshold multiplier controls how big of a move we demand relative to typical volatility
THRESHOLD_MULTIPLIER = 0.5 

# Pain multiplier controls how deep of a drawdown we can stomach relative to typical volatility
PAIN_MULTIPLIER = 1.5

# --- DB & Storage ---
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
DB_CONNECTION_STRING = os.environ.get("DATABASE_URL", "")

# Directory to save/load trained models
ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")

# --- Training ---
# Minimum historical bars required to train a ticker
MIN_BARS_REQUIRED = 500

# --- Strategy Core ---
MAX_CONCURRENT_POSITIONS = 5
MAX_RISK_PER_TRADE = 0.20
