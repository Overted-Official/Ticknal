# THOTH Production Champion Scorecard V1

## Frozen Model
Model: THOTH EGX PSI-8 Macro V3.7

Status:
PRODUCTION FROZEN

---

# Pillar 1: Primary Growth Champion

Objective:
Maximum capital compounding.

Configuration:
- Universe: Full Eligible EGX Universe
- Entry: Conviction >= 70
- Sector Limit: 30%
- Position Slots: 10
- Cash Buffer: Fixed 10%
- Exit: Dynamic Velocity Exit
- Prioritization: Delta Percentile Priority

Metrics:
ROI: +120.76%
Sharpe: 2.21
Sortino: 3.08
Max Drawdown: -9.75%
Win Rate: 64.3%
Profit Factor: 2.56

---

# Pillar 2: Institutional Risk Champion

Objective:
Capital preservation and risk-adjusted deployment.

Configuration:
- Universe: Bayesian Top 50
- Entry: Conviction >= 70
- Sector Limit: 30%
- Slots: 10
- Exit: Fixed Exhaustion >=90
- Prioritization: Exhaustion Only

Metrics:
ROI: +103.97%
Sharpe: 2.58
Sortino: 3.22
Max Drawdown: -8.37%
Win Rate: 69.5%
Profit Factor: 2.64

---

# Pillar 3: Production Control Baseline

Objective:
Future model benchmark.

Configuration:
- Universe: Full Eligible Universe
- Entry: Conviction >=70
- Sector Limit: 30%
- Slots: 10
- Exit: Fixed Exhaustion >=90
- Prioritization: Natural Priority

Metrics:
ROI: +119.19%
Sharpe: 2.15
Sortino: 2.51
Max Drawdown: -10.48%
Win Rate: 67.2%
Profit Factor: 2.75

---

Promotion Rule:
A future model version must outperform this scorecard under identical testing rules.