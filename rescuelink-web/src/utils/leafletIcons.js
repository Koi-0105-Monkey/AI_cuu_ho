import L from 'leaflet';

/**
 * Fix Leaflet default marker icons broken by Vite's asset pipeline.
 * Call once at app startup or at the top of any file that uses Leaflet.
 * Safe to call multiple times (idempotent).
 */
export function setupLeafletIcons() {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

/** Pulsing red dot — active incident / SOS (with inline ! SVG icon) */
export const incidentIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-6 h-6">
    <div class="absolute w-full h-full bg-rose-600 rounded-full opacity-60 animate-ping"></div>
    <div class="w-4.5 h-4.5 bg-rose-600 rounded-full border border-white z-10 shadow-lg flex items-center justify-center">
      <svg viewBox="0 0 24 24" class="w-2.5 h-2.5" stroke="white" stroke-width="4" fill="none" stroke-linecap="round">
        <line x1="12" y1="5" x2="12" y2="14"/>
        <line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
    </div>
  </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/** Pulsing blue dot — active trekker (safe) (with inline check SVG icon) */
export const tripIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-6 h-6">
    <div class="absolute w-full h-full bg-sky-500 rounded-full opacity-40 animate-pulse"></div>
    <div class="w-4.5 h-4.5 bg-sky-500 rounded-full border border-white z-10 shadow-lg flex items-center justify-center">
      <svg viewBox="0 0 24 24" class="w-2.5 h-2.5" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>
  </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/** Orange fire hotspot — satellite hotspot (with inline fire SVG icon) */
export const fireHotspotIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-6 h-6">
    <div class="absolute w-full h-full bg-orange-600 rounded-full opacity-60 animate-ping"></div>
    <div class="w-4.5 h-4.5 bg-orange-500 rounded-full border border-white z-10 shadow-lg flex items-center justify-center">
      <svg viewBox="0 0 24 24" class="w-2.5 h-2.5" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
      </svg>
    </div>
  </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/** Dark slate dot with shield icon — forest ranger patrol (with inline shield SVG icon) */
export const rangerIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-6 h-6">
    <div class="absolute w-full h-full bg-slate-500 rounded-full opacity-40 animate-pulse"></div>
    <div class="w-4.5 h-4.5 bg-slate-700 rounded-full border border-white z-10 shadow-lg flex items-center justify-center">
      <svg viewBox="0 0 24 24" class="w-2.5 h-2.5" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    </div>
  </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/** Operator emergency trekker — red pulsing with ! SVG icon */
export const emergencyTrekkerIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-6 h-6">
    <div class="absolute w-full h-full bg-rose-600 rounded-full opacity-60 animate-ping"></div>
    <div class="w-4.5 h-4.5 bg-rose-600 rounded-full border border-white z-10 shadow-lg flex items-center justify-center">
      <svg viewBox="0 0 24 24" class="w-2.5 h-2.5" stroke="white" stroke-width="4" fill="none" stroke-linecap="round">
        <line x1="12" y1="5" x2="12" y2="14"/>
        <line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
    </div>
  </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/** Custom island sovereignty labels */
export const islandIcon = (name) => L.divIcon({
  html: `<div class="flex flex-col items-center justify-center">
    <div class="w-2.5 h-2.5 bg-yellow-500 rounded-full border border-red-600 shadow-md"></div>
    <div class="bg-slate-900/90 border border-slate-700 text-white font-bold text-[9px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap mt-1">
      ${name} (VN)
    </div>
  </div>`,
  className: 'custom-leaflet-island-icon',
  iconSize: [100, 36],
  iconAnchor: [50, 18],
});
