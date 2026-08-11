import pandas as pd

class PortfolioRiskManager:
    def __init__(self, max_concurrent_positions: int = 5, max_risk_per_trade: float = 0.20):
        self.max_positions = max_concurrent_positions
        self.max_risk = max_risk_per_trade
        self.current_positions = []
        
    def can_enter(self, ticker: str) -> bool:
        """Check if we have room for another position."""
        if len(self.current_positions) >= self.max_positions:
            return False
            
        if ticker in self.current_positions:
            return False
            
        return True
        
    def add_position(self, ticker: str):
        if ticker not in self.current_positions:
            self.current_positions.append(ticker)
            
    def remove_position(self, ticker: str):
        if ticker in self.current_positions:
            self.current_positions.remove(ticker)
            
    def get_position_size(self, capital: float, mdm: float, param_sl: float) -> float:
        """
        Calculate position size based on risk and MDM-based stop loss.
        """
        if mdm == 0 or param_sl == 0:
            return capital * (1.0 / self.max_positions)
            
        # The expected stop loss percentage
        sl_pct = (mdm * param_sl) / 100.0
        
        # Risk 2% of total capital per trade
        risk_amount = capital * 0.02
        
        # Size = Risk / Stop Loss %
        target_size = risk_amount / sl_pct if sl_pct > 0 else capital
        
        # Cap at max_risk_per_trade
        max_size = capital * self.max_risk
        
        return min(target_size, max_size)
