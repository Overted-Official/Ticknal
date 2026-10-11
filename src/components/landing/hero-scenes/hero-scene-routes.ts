export const HERO_SCENE_ROUTES = {
  tablet: {
    src: '/charts?ticker=COMI&timeframe=D&heroScene=landing',
    title: 'Ticknal SuperCharts workspace',
    viewport: { width: 1024, height: 768 },
  },
  phone: {
    src: '/charts?ticker=COMI&timeframe=D&heroScene=landing',
    title: 'Ticknal platform motion sequence',
    viewport: { width: 390, height: 844 },
  },
} as const;
