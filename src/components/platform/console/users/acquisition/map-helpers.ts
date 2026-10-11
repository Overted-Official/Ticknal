import L from 'leaflet';

export type MapPresetView = 'cairo_metro' | 'egypt' | 'world';
export type MapLayerTheme = 'dark' | 'osm';

export const MAP_PRESETS: Record<MapPresetView, { center: [number, number]; zoom: number; label: string }> = {
  cairo_metro: {
    center: [30.0143, 31.1592],
    zoom: 11,
    label: 'Cairo Metro',
  },
  egypt: {
    center: [26.8206, 30.8025],
    zoom: 6,
    label: 'Egypt',
  },
  world: {
    center: [24, 25],
    zoom: 2.5,
    label: 'World',
  },
};

export const TILE_URLS = {
  esriBase: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  esriLabels: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
  osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
};

export function createMarkerPinIcon(displayCount: number): L.DivIcon {
  const markerHtml = `
    <div class="relative flex items-center justify-center cursor-pointer" style="width: 28px; height: 28px;">
      <span class="absolute w-7 h-7 rounded-full bg-brand-blue/30 animate-ping" style="animation-duration: 2.5s;"></span>
      <span class="relative flex items-center justify-center w-6 h-6 rounded-full bg-brand-blue border border-white/40 text-[10px] font-semibold text-white shadow-xl tabular-nums">
        ${displayCount}
      </span>
    </div>
  `;

  return L.divIcon({
    className: 'custom-osm-pin',
    html: markerHtml,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

export function createMarkerPopupHtml(params: {
  cityName: string;
  regionName: string;
  countryName: string;
  countryCode: string;
  lat: number;
  lng: number;
  userCount: number;
  sessionCount: number;
  adRadiusKm: number;
  sharePct: number;
  metricMode: 'users' | 'sessions';
  userProfiles: { name: string; email: string; avatarUrl: string | null }[];
}): string {
  const {
    cityName,
    regionName,
    countryCode,
    lat,
    lng,
    userCount,
    sessionCount,
    adRadiusKm,
    sharePct,
    metricMode,
    userProfiles,
  } = params;

  const usersListHtml =
    userProfiles.length > 0
      ? `
      <div class="pt-2 border-t border-border-default space-y-1">
        <div class="text-[9px] uppercase tracking-wider text-text-muted font-medium">
          Verified Accounts (${userProfiles.length})
        </div>
        ${userProfiles
          .map(
            (p) => `
          <div class="flex items-center justify-between text-[11px] py-0.5">
            <span class="text-text-primary font-medium truncate max-w-[120px]">${p.name}</span>
            <span class="text-text-muted text-[10px] truncate max-w-[130px]">${p.email}</span>
          </div>
        `
          )
          .join('')}
      </div>
    `
      : '';

  return `
    <div class="p-3 bg-black text-text-primary font-sans text-xs min-w-[240px] rounded-none border border-border-default select-none">
      <div class="flex items-center justify-between pb-2 pr-6 border-b border-border-default">
        <span class="font-semibold text-sm text-text-primary">${cityName}</span>
        <span class="text-[10px] text-brand-blue font-semibold tabular-nums">
          ${sharePct}% ${metricMode === 'users' ? 'user' : 'session'} share
        </span>
      </div>
      <div class="pt-2 pb-1 space-y-1 text-[11px] text-text-muted">
        <div class="flex justify-between">
          <span>Governorate:</span>
          <span class="text-text-secondary">${regionName} (${countryCode})</span>
        </div>
        <div class="flex justify-between">
          <span>Verified Users:</span>
          <span class="text-text-primary font-semibold tabular-nums">${userCount} ${userCount === 1 ? 'user' : 'users'}</span>
        </div>
        <div class="flex justify-between">
          <span>Total Sessions:</span>
          <span class="text-text-secondary tabular-nums">${sessionCount} sessions</span>
        </div>
        <div class="flex justify-between">
          <span>Coordinates:</span>
          <span class="text-text-muted text-[10px] tabular-nums">${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E</span>
        </div>
        <div class="flex justify-between text-brand-blue font-medium">
          <span>Targeting Radius:</span>
          <span class="tabular-nums">${adRadiusKm} km</span>
        </div>
      </div>
      ${usersListHtml}
    </div>
  `;
}
