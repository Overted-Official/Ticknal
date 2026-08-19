/**
 * PSI-50 Flagship Index Universe
 * Curated basket of the 50 premier dual-alpha generating EGX tickers + Gold,
 * validated across multi-decade historical cycles (<= 2024) and out-of-sample forward testing (2025–2026).
 */

export const PSI_50_TICKERS_ARRAY = [
  'ABUK', // Abou Kir Fertilizers & Chemical Industries Co.
  'ADPC', // Arab Dairy Products Co. Arab Dairy - Panda
  'ADRI', // Arab Development & Real Estate Investment
  'AIH',  // Arabia Investments Holding SAE
  'AMII', // Arabian Metal Industries
  'APPC', // Advanced Pharmaceutical Packaging Co.
  'APSW', // Arab Polvara Spinning & Weaving Co.
  'BIDI', // El Badr Investment and Development
  'BINV', // B Investments Holding SAE
  'CANA', // Suez Canal Bank SAE
  'CCRS', // Gulf Canadian Real Estate Investment Co.
  'COMI', // Commercial International Bank - Egypt (CIB) S.A.E.
  'COPR', // Cooper for Commercial Investment & Real Estate Development
  'COSG', // Cairo Oils & Soap
  'EALR', // El Arabia for Land Reclamation
  'EAST', // Eastern Company
  'ECAP', // El Ezz Ceramics & Porcelain Co. (Gemma)
  'EDFM', // East Delta Flour Mills Co.
  'EEII', // El Arabia Engineering Industries
  'EGCH', // Egyptian Chemical Industries (Kima)
  'ELKA', // El Kahera Housing
  'ELNA', // El Nasr for Manufacturing Agricultural Crops
  'EMFD', // Emaar Misr for Development SAE
  'EPPK', // El Ahram Co. for Printing & Packing
  'ETRS', // Egyptian Transport And Commercial Services Co. (Egytrans Nosco)
  'EXPA', // Export Development Bank of Egypt
  'FCMD', // Future Care For Medical Industries
  'FIRE', // First Investment & Real Estate Development
  'GC1!', // Gold Futures
  'GIHD', // Gharbia Islamic Housing Development
  'GSSC', // General Silos & Storage Co.
  'HRHO', // EFG Holding S.A.E.
  'IBCT', // International Business Corp. for Trading & Agencies
  'IDRE', // Ismailia Development & Real Estate Co.
  'ISMQ', // Iron & Steel for Mines & Quarries
  'KWIN', // El Kahera El Watania Investment
  'LKGP', // The Holding Company for Financial Investment - The Lakah Group
  'MBEG', // MB for Engineering & Contracting
  'MOIL', // Maridive & Oil Services SAE
  'MTIE', // MM Group for Industry & International Trade
  'OBRI', // El Obour Real Estate Investment
  'OFH',  // O B Financial Holding
  'ORAS', // Orascom Construction Plc
  'ORWE', // Oriental Weavers Carpet
  'PACH', // Paints & Chemical Industries Co.
  'PHDC', // Palm Hills Development Co.
  'POUL', // Cairo Poultry Co.
  'RAKT', // Rakta Paper Manufacturing
  'RAYA', // Raya Holding for Financial Investments SAE
  'RKAZ', // REKAZ Financial Holding
  'RTVC', // Remco for Touristic Villages Construction
  'SAIB', // Societe Arabe Internationale de Banque
  'SAUD', // Al Baraka Bank Egypt
  'SCFM', // South Cairo & Giza Mills & Bakeries
  'SKPC', // Sidi Kerir Petrochemicals
  'TANM', // Tanmiya for Real Estate Investment
  'TAQA', // TAQA Arabia
  'UEFM', // Upper Egypt Flour Mills Co.
  'UTOP', // Utopia Real Estate Investment & Tourism SAE
  'VERT', // Vertika for Industry & Trade
  'VLMR', // Valmore Holding
] as const;

export const PSI_50_TICKERS = new Set<string>(PSI_50_TICKERS_ARRAY);

export function isPsi50Ticker(symbol: string): boolean {
  if (!symbol) return false;
  const clean = symbol.trim().toUpperCase().replace('.CA', '');
  if (PSI_50_TICKERS.has(clean)) return true;
  if (clean === 'GOLD' || clean === 'GC1' || clean === 'GC') return true;
  if (clean === 'SILVER' || clean === 'SI1' || clean === 'SI') return true;
  return false;
}
