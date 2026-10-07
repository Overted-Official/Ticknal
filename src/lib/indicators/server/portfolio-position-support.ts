export interface PortfolioPositionForValuation {
  readonly side: string;
  readonly quantity: string | number;
}

export function supportsLongOnlyPortfolioValuation(
  positions: readonly PortfolioPositionForValuation[],
): boolean {
  return positions.every((position) => {
    const quantity = Number(position.quantity);
    return position.side.toUpperCase() === 'LONG'
      && Number.isFinite(quantity)
      && quantity > 0;
  });
}
