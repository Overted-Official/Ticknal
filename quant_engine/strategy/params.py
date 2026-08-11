TICKER_OVERRIDES = {
    'COMI': {'entry_levels': [14.6, 23.6], 'use_smrt_exit': True, 'smrt_exit_lvl': 50.0, 'use_aym': True, 'aym': 4.0, 'aym_lim': 61.8, 'use_atr': True, 'atr_m': 4.0, 'use_sl': True, 'sl': 5.0},
    'ADIB': {'entry_levels': [23.6, 38.2, 50.0, 61.8], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 8.0, 'aym_lim': 88.6, 'use_atr': False, 'atr_m': None, 'use_sl': False, 'sl': None},
    'HDBK': {'entry_levels': [14.6], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 3.0, 'aym_lim': 50.0, 'use_atr': False, 'atr_m': None, 'use_sl': False, 'sl': None},
    'CANA': {'entry_levels': [14.6, 23.6, 38.2, 50.0], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 9.0, 'aym_lim': 78.6, 'use_atr': True, 'atr_m': 5.0, 'use_sl': False, 'sl': None},
    'JUFO': {'entry_levels': [14.6, 23.6, 38.2], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 4.0, 'aym_lim': 78.6, 'use_atr': False, 'atr_m': None, 'use_sl': False, 'sl': None},
    'POUL': {'entry_levels': [14.6, 38.2], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 10.0, 'aym_lim': 88.6, 'use_atr': True, 'atr_m': 6.0, 'use_sl': False, 'sl': None},
    'IFAP': {'entry_levels': [38.2, 61.8], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 3.0, 'aym_lim': 88.6, 'use_atr': True, 'atr_m': 4.0, 'use_sl': False, 'sl': None},
    'SCFM': {'entry_levels': [14.6, 38.2, 50.0], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 6.0, 'aym_lim': 88.6, 'use_atr': False, 'atr_m': None, 'use_sl': False, 'sl': None},
    'EFIC': {'entry_levels': [14.6, 23.6, 38.2, 50.0], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 3.0, 'aym_lim': 61.8, 'use_atr': True, 'atr_m': 5.0, 'use_sl': False, 'sl': None},
    'ICFC': {'entry_levels': [14.6, 23.6, 38.2], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 12.0, 'aym_lim': 78.6, 'use_atr': True, 'atr_m': 4.0, 'use_sl': False, 'sl': None},
    'MCQE': {'entry_levels': [23.6, 38.2], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 12.0, 'aym_lim': 88.6, 'use_atr': False, 'atr_m': None, 'use_sl': False, 'sl': None},
    'ARCC': {'entry_levels': [14.6, 61.8], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 8.0, 'aym_lim': 88.6, 'use_atr': True, 'atr_m': 6.0, 'use_sl': False, 'sl': None},
    'SCEM': {'entry_levels': [38.2, 50.0], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 2.0, 'aym_lim': 78.6, 'use_atr': False, 'atr_m': None, 'use_sl': False, 'sl': None},
    'MBSC': {'entry_levels': [23.6, 61.8], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 2.0, 'aym_lim': 88.6, 'use_atr': False, 'atr_m': None, 'use_sl': False, 'sl': None},
    'PHDC': {'entry_levels': [14.6, 23.6, 61.8], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 2.0, 'aym_lim': 78.6, 'use_atr': False, 'atr_m': None, 'use_sl': False, 'sl': None},
    'EALR': {'entry_levels': [14.6], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 6.0, 'aym_lim': 88.6, 'use_atr': True, 'atr_m': 6.0, 'use_sl': False, 'sl': None},
    'WKOL': {'entry_levels': [38.2, 50.0], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 2.0, 'aym_lim': 78.6, 'use_atr': False, 'atr_m': None, 'use_sl': False, 'sl': None},
    'MPCI': {'entry_levels': [23.6, 38.2, 61.8], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 8.0, 'aym_lim': 78.6, 'use_atr': True, 'atr_m': 3.0, 'use_sl': False, 'sl': None},
    'NIPH': {'entry_levels': [38.2, 50.0, 61.8], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 8.0, 'aym_lim': 88.6, 'use_atr': True, 'atr_m': 3.0, 'use_sl': False, 'sl': None},
    'EGAL': {'entry_levels': [14.6], 'use_smrt_exit': True, 'smrt_exit_lvl': 50.0, 'use_aym': True, 'aym': 12.0, 'aym_lim': 78.6, 'use_atr': False, 'atr_m': None, 'use_sl': False, 'sl': None},
    'IRON': {'entry_levels': [14.6], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 3.0, 'aym_lim': 78.6, 'use_atr': False, 'atr_m': None, 'use_sl': True, 'sl': 4.0},
    'MBEG': {'entry_levels': [14.6, 23.6, 61.8], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 12.0, 'aym_lim': 78.6, 'use_atr': True, 'atr_m': 4.0, 'use_sl': False, 'sl': None},
    'GBCO': {'entry_levels': [23.6], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 2.0, 'aym_lim': 61.8, 'use_atr': False, 'atr_m': None, 'use_sl': False, 'sl': None},
    'SWDY': {'entry_levels': [14.6, 50.0], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 3.0, 'aym_lim': 78.6, 'use_atr': False, 'atr_m': None, 'use_sl': False, 'sl': None},
    'EMFD': {'entry_levels': [14.6, 23.6, 38.2], 'use_smrt_exit': True, 'smrt_exit_lvl': 61.8, 'use_aym': True, 'aym': 3.0, 'aym_lim': 88.6, 'use_atr': False, 'atr_m': None, 'use_sl': False, 'sl': None},
    'AFMC': {'entry_levels': [14.6, 50.0], 'use_smrt_exit': False, 'smrt_exit_lvl': 78.6, 'use_aym': True, 'aym': 3.0, 'aym_lim': 78.6, 'use_atr': False, 'atr_m': None, 'use_sl': False, 'sl': None},
    'ORHD': {'entry_levels': [14.6, 23.6], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 3.0, 'aym_lim': 61.8, 'use_atr': False, 'atr_m': None, 'use_sl': False, 'sl': None},
    'BTFH': {'entry_levels': [23.6, 38.2], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 2.0, 'aym_lim': 78.6, 'use_atr': True, 'atr_m': 3.0, 'use_sl': False, 'sl': None},
    'OIH': {'entry_levels': [23.6, 50.0], 'use_smrt_exit': True, 'smrt_exit_lvl': 50.0, 'use_aym': True, 'aym': 8.0, 'aym_lim': 78.6, 'use_atr': True, 'atr_m': 3.0, 'use_sl': False, 'sl': None},
    'EFID': {'entry_levels': [23.6, 50.0], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 4.0, 'aym_lim': 78.6, 'use_atr': False, 'atr_m': None, 'use_sl': False, 'sl': None},
    'OLFI': {'entry_levels': [14.6, 50.0], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 3.0, 'aym_lim': 88.6, 'use_atr': True, 'atr_m': 4.0, 'use_sl': False, 'sl': None},
    'ORWE': {'entry_levels': [14.6, 23.6, 38.2], 'use_smrt_exit': True, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 3.0, 'aym_lim': 78.6, 'use_atr': False, 'atr_m': None, 'use_sl': False, 'sl': None},
    'ETEL': {'entry_levels': [14.6, 38.2, 61.8], 'use_smrt_exit': False, 'smrt_exit_lvl': None, 'use_aym': True, 'aym': 5.0, 'aym_lim': 78.6, 'use_atr': False, 'atr_m': None, 'use_sl': False, 'sl': None},
}


GLOBAL_CANDIDATE_PARAMS = {
    # The ML candidate generator must be broad and identical for every ticker.
    # The classifier, rather than a hindsight-optimized ticker table, decides
    # which of these causal opportunities are worth accepting.
    'entry_levels': [14.6, 23.6, 38.2, 50.0, 61.8],
    'use_smrt_exit': True,
    'smrt_exit_lvl': 50.0,
    'use_aym': True,
    'aym': 3.5,
    'aym_lim': 61.8,
    'use_atr': True,
    'atr_m': 2.5,
    'use_sl': True,
    'sl': 6.0,
    'w_price': 21.0,
    'w_rsi': 10.0,
    'w_banker': 5.0,
    'w_bb': 4.0,
    'w_st': 44.0,
    'w_adx': 10.0,
    'w_ma': 4.0,
    'w_slope': 1.0,
}


def get_global_candidate_params() -> dict:
    """Return an isolated copy of the fixed, cross-sectional ML parameters."""
    params = GLOBAL_CANDIDATE_PARAMS.copy()
    params['entry_levels'] = list(GLOBAL_CANDIDATE_PARAMS['entry_levels'])
    return params

def get_params_for_ticker(ticker_symbol: str, class_info: dict) -> dict:
    """
    Returns the parameter configuration for a given ticker.
    Overrides defaults if an optimized configuration exists for this ticker.
    """
    # 1. Start with Dynamic defaults based on classification
    liq = class_info.get('liquidity_class', 'ILLIQUID')
    vol = class_info.get('vol_regime', 'HIGH_VOL')
    
    # Default Base Parameters
    params = {
        'entry_levels': [14.6, 23.6],
        'use_smrt_exit': True,
        'smrt_exit_lvl': 50.0,
        'use_aym': True,
        'aym': 3.5,
        'aym_lim': 61.8,
        'use_atr': True,
        'atr_m': 2.5,
        'use_sl': True,
        'sl': 6.0,
        
        # Indicator Weights (fixed dynamically based on regime)
        'w_price': 21.0,
        'w_rsi': 10.0,
        'w_banker': 5.0,
        'w_bb': 4.0,
        'w_st': 44.0,
        'w_adx': 10.0,
        'w_ma': 4.0,
        'w_slope': 1.0
    }
    
    # Adjust dynamic defaults
    if liq == 'LIQUID' and vol == 'LOW_VOL':
        params.update({
            'aym': 3.0,
            'sl': 4.0,
            'atr_m': 2.0
        })
    elif vol == 'HIGH_VOL':
        params.update({
            'entry_levels': [23.6, 38.2],
            'aym': 4.5 if liq == 'LIQUID' else 6.0,
            'aym_lim': 76.4 if liq == 'LIQUID' else 80.0,
            'sl': 8.0 if liq == 'LIQUID' else 10.0,
            'atr_m': 3.0 if liq == 'LIQUID' else 4.0,
            'w_st': 50.0 if liq == 'LIQUID' else 30.0,
            'w_rsi': 8.0 if liq == 'LIQUID' else 15.0
        })
        
    # 2. Override with Hardcoded Optimization Table
    if ticker_symbol in TICKER_OVERRIDES:
        override = TICKER_OVERRIDES[ticker_symbol]
        params.update(override)
        
    return params
