CREATE TABLE IF NOT EXISTS push_subscriptions (
  id serial PRIMARY KEY,
  device_id varchar(64) NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_device_id_idx
  ON push_subscriptions (device_id);

CREATE TABLE IF NOT EXISTS ticker_alerts (
  id serial PRIMARY KEY,
  device_id varchar(64) NOT NULL,
  ticker_symbol varchar(20) NOT NULL REFERENCES tickers(symbol) ON DELETE cascade,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticker_alerts_device_ticker_unique UNIQUE (device_id, ticker_symbol)
);

CREATE INDEX IF NOT EXISTS ticker_alerts_ticker_idx
  ON ticker_alerts (ticker_symbol);

CREATE TABLE IF NOT EXISTS signal_notifications (
  id serial PRIMARY KEY,
  device_id varchar(64) NOT NULL,
  ticker_symbol varchar(20) NOT NULL REFERENCES tickers(symbol) ON DELETE cascade,
  signal_date date NOT NULL,
  signal varchar(20) NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT signal_notifications_unique UNIQUE (device_id, ticker_symbol, signal_date, signal)
);

CREATE INDEX IF NOT EXISTS signal_notifications_ticker_date_idx
  ON signal_notifications (ticker_symbol, signal_date);

CREATE TABLE IF NOT EXISTS orders (
  id serial PRIMARY KEY,
  ticker_symbol varchar(20) NOT NULL REFERENCES tickers(symbol) ON DELETE cascade,
  status varchar(12) NOT NULL DEFAULT 'OPEN',
  side varchar(10) NOT NULL DEFAULT 'LONG',
  entry_date date NOT NULL,
  entry_price numeric(12, 4) NOT NULL,
  quantity numeric(16, 4) NOT NULL DEFAULT 1,
  target_price numeric(12, 4),
  stop_price numeric(12, 4),
  exit_date date,
  exit_price numeric(12, 4),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_status_idx
  ON orders (status);

CREATE INDEX IF NOT EXISTS orders_ticker_status_idx
  ON orders (ticker_symbol, status);
