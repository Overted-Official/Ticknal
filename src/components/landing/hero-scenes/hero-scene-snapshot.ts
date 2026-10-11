import chartSnapshot from './data/2026-10-10/charts.json';
import marketsSnapshot from './data/2026-10-10/markets.json';
import newsSnapshot from './data/2026-10-10/news.json';
import fxSnapshot from './data/2026-10-10/fx.json';
import flowsSnapshot from './data/2026-10-10/flows.json';

// Captured once on 2026-10-10. Market observations end at the 2026-10-07 session.
// These imports never contact the database when the hero devices render.
export const HERO_SCENE_CHART = chartSnapshot;
export const HERO_SCENE_MARKETS = marketsSnapshot;
export const HERO_SCENE_NEWS = newsSnapshot;
export const HERO_SCENE_FX = fxSnapshot;
export const HERO_SCENE_FLOWS = flowsSnapshot;
