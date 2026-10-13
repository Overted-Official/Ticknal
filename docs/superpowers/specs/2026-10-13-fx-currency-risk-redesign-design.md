# FX & Currency Risk Section Redesign: Live Egyptian Gold ("دولار الصاغة"), ATR Volatility Compression, & 5-Card Macro Barometer

## 1. Problem Statement
The current **FX & Currency Risk** section on the Markets page suffers from several critical flaws:
1. **Lack of Visual Trendlines / Assisting Visuals**: KPI cards show static numbers with zero sense of momentum or historical stability.
2. **Artificial & Vague Devaluation Risk Score**: Hardcoded to a baseline of 15% with a static `(48–52)` corridor string that is disconnected from real market dynamics (with USD/EGP trading around ~52.60).
3. **Ambiguous Proxy Terminology**: Labeled "CIB London GDR Arbitrage" without clarifying that this represents the offshore equity shadow dollar (**"دولار CIB"**).
4. **Missing Local Egyptian Physical Gold**: Gold calculations were circularly converting international COMEX futures at the official USD rate rather than measuring Egypt's physical Sagha gold market (**"دولار الصاغة"**).

## 2. High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                Data Ingestion Pipeline                                 │
│                                                                                        │
│  [iSagha Market Scraper]    [TradingView WS]       [EGX Database]      [CBE / NFA DB]  │
│   • Local 24k / 21k (EGP)    • COMEX Gold ($/oz)    • COMI.CA (EGP)     • Net Foreign   │
│   • Global Ounce ($/oz)      • CBKD LSE GDR ($)     • USDEGP (14D ATR)    Assets Buffer │
└───────────────────────┬──────────────┬─────────────────────┬──────────────────┬────────┘
                        │              │                     │                  │
                        ▼              ▼                     ▼                  ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        Backend Handler: /api/macro/fx-fair-value                       │
│                                                                                        │
│  1. Implied Sagha Dollar ("دولار الصاغة") = (Local 24k × 31.1035) ÷ Spot Ounce        │
│  2. Implied CIB Dollar ("دولار CIB")     = COMI Price ÷ LSE CBKD GDR Price            │
│  3. ATR Volatility Suppression Factor   = ATR14 ÷ ATR90 on USDEGP                      │
│  4. Dynamic Devaluation Risk Index      = 0.40(Spreads) + 0.35(ATR) + 0.25(NFA)        │
│  5. 30D / 14D Sparkline Arrays          = Historical price series for all 5 cards      │
└────────────────────────────────────────────────┬───────────────────────────────────────┘
                                                 │
                                                 ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                            UI: FxDevaluationSection.tsx                                │
│                                                                                        │
│  Desktop: 5-Card Unified Grid (100% width)                                             │
│  Mobile:  Side-Scrollable Momentum Rail with Peek                                      │
│                                                                                        │
│  [ Card 1: Official USD/EGP ]      [ Card 2: Composite Real Fair EGP ]                │
│   • Spot rate + 14D ATR             • Triangulated rate + % Gap vs Official           │
│   • 30-Day SVG Sparkline            • Visual Delta Gap Gauge                          │
│                                                                                        │
│  [ Card 3: Local Gold Proxy ]      [ Card 4: Offshore CIB GDR Proxy ]                 │
│   • Sagha Dollar ("دولار الصاغة")   • London Dollar ("دولار CIB")                     │
│   • 14-Day SVG Sparkline            • 14-Day SVG Sparkline                            │
│                                                                                        │
│  [ Card 5: Devaluation Risk Index ]                                                    │
│   • Dynamic 0-100% Score + Active Peg Alert / Crawl Tag                               │
│   • Color-Coded Risk Gauge Bar                                                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Subsystem Detailed Designs

### 3.1 Local Egyptian Gold Scraper & Implied Dollar
- **Source**: `https://market.isagha.com/prices` (and fallback `https://isagha.com`).
- **Data Extracted**:
  - `24k`: Gram buy and sell price in EGP.
  - `21k`: Gram buy and sell price in EGP (with formula fallback: $\text{Price}_{24k} = \text{Price}_{21k} \times \frac{24}{21}$).
  - `spot_ounce_usd`: Global spot ounce price in USD.
- **Sagha Dollar Formula**:
  $$\text{USD/EGP}_{\text{Sagha}} = \frac{\text{Local 24k (EGP/g)} \times 31.1034768}{\text{Spot Gold (USD/oz)}}$$
- **Storage**: Registered as `GOLD24K` in `tickers` and daily records appended to `daily_prices`.

### 3.2 The Algorithmic Devaluation Risk Index (0–100%)
The score replaces the static 15% with a dynamic, multi-factor calculation:
$$\text{Devaluation Risk} = (0.40 \times \text{Proxy Spread Score}) + (0.35 \times \text{ATR Compression Score}) + (0.25 \times \text{Macro Liquidity Score})$$

#### A. Proxy Spread Score ($0 - 100$)
- Evaluates the average premium of the two market shadow rates vs the official rate:
  $$\text{Avg Spread} = \frac{\text{Spread}_{\text{GDR}} + \text{Spread}_{\text{Gold}}}{2}$$
- $\text{Avg Spread} \le 1.0\% \implies \text{Score} \in [5, 15]$ (Exact parity)
- $\text{Avg Spread} \in (1.0\%, 5.0\%] \implies \text{Score} \in [16, 45]$ (Orderly drift)
- $\text{Avg Spread} \in (5.0\%, 12.0\%] \implies \text{Score} \in [46, 75]$ (Elevated tension)
- $\text{Avg Spread} > 12.0\% \implies \text{Score} \in [76, 100]$ (Severe parallel run)

#### B. ATR Volatility Suppression Score ($0 - 100$)
- Measures the "pressure cooker" effect where an exchange rate is artificially pegged/suppressed:
  $$\text{ATR}_{14} = \frac{1}{14} \sum_{i=1}^{14} \max(\text{High}_i - \text{Low}_i, |\text{High}_i - \text{Close}_{i-1}|, |\text{Low}_i - \text{Close}_{i-1}|)$$
- If $\text{ATR}_{14} < 0.04$ EGP/day while proxy spreads or inflation diverge, the compression factor triggers high pressure ($\ge 75$), signaling an artificially flatlined peg prone to sudden step-devaluation.
- If $\text{ATR}_{14}$ reflects normal two-way market volatility ($0.15 - 0.40$ EGP/day), compression score is low ($\le 20$).

#### C. Macro Liquidity Score ($0 - 100$)
- Ingests latest commercial bank + CBE Net Foreign Assets (NFA) balance.
- Multi-billion surplus cushions the pound, reducing score by up to 25 points; deficits elevate the score.

#### Dynamic Classification Badges
- `0% – 25%`: `Low Risk · Organic Float`
- `26% – 50%`: `Moderate Risk · Controlled Crawl`
- `51% – 75%`: `Elevated Risk · Volatility Compression`
- `76% – 100%`: `High Risk · Severe Dislocation`

---

### 3.3 Visual Components & Responsive Layout

#### A. Mini SVG Sparkline Component
- Lightweight, zero-dependency SVG sparkline rendered directly inside `KPICard.tsx`.
- Normalizes an array of $N$ points (14D or 30D), drawing a smooth hairline path with subtle gradient fill beneath the curve (`fill="url(#sparkline-grad)"`).
- Color-coded: green (`#22c55e`), cyan (`#0099ff`), orange (`#f97316`), or purple (`#a855f7`).

#### B. The 5 Cards
1. **Official USD/EGP (`سعر الدولار الرسمي`)**:
   - Value: `52.60 EGP`
   - Subtitle: `14D ATR: 0.06 EGP/day · Suppressed Range`
   - Visual: 30-Day mini sparkline
2. **Real EGP Fair Value (`القيمة العادلة الحقيقية`)**:
   - Value: `53.25 EGP`
   - Subtitle: `+1.2% Gap · +0.65 EGP vs Official`
   - Visual: Delta gap indicator bar
3. **Local Gold Proxy ("دولار الصاغة")**:
   - Value: `52.79 EGP`
   - Subtitle: `Local 24k 7,063 ج.م ÷ Spot $4,161 · +0.4% Spread`
   - Visual: 14-Day mini sparkline
4. **Offshore CIB GDR Proxy ("دولار CIB")**:
   - Value: `53.78 EGP`
   - Subtitle: `EGX COMI 127.20 ج.م ÷ LSE $2.365 · +2.2% Spread`
   - Visual: 14-Day mini sparkline
5. **Devaluation Risk Index (`مؤشر ضغط التعويم`)**:
   - Value: `28% RISK`
   - Subtitle: `Controlled Crawl · ATR Compression: Moderate`
   - Visual: Segmented risk gauge meter bar

#### C. Layout
- **Desktop**: Single 5-column grid `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5`.
- **Mobile**: Horizontal scrolling rail `flex overflow-x-auto snap-x no-scrollbar gap-3 pb-2` with the 3rd card peeking.
- **Styling**: Pure pitch black (`bg-black`), hairline borders (`border-white/[0.08]`), `tabular-nums` for prices, no `font-mono`.

---

## 4. Verification & Testing
1. **TypeScript Typecheck**: `npx tsc --noEmit` exits with code 0.
2. **Production Build**: `npm run build` exits with code 0.
3. **API Endpoint Verification**: Query `/api/macro/fx-fair-value` and confirm all 5 metrics, ATR calculations, and sparkline point arrays return valid JSON.
4. **Responsive Visual Testing**: Verify mobile rail and desktop 5-grid layouts render cleanly without horizontal overflow.
