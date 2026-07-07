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

/** Pulsing red dot — active incident / SOS */
export const incidentIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-6 h-6">
    <div class="absolute w-full h-full bg-red-500 rounded-full opacity-60 animate-ping"></div>
    <div class="w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white z-10 shadow-lg"></div>
  </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/** Pulsing green dot — active trekker */
export const tripIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-6 h-6">
    <div class="absolute w-full h-full bg-emerald-500 rounded-full opacity-40 animate-pulse"></div>
    <div class="w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white z-10 shadow-lg"></div>
  </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/** Orange fire emoji — satellite fire hotspot */
export const fireHotspotIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-6 h-6">
    <div class="absolute w-full h-full bg-red-600 rounded-full opacity-60 animate-ping"></div>
    <div class="w-3.5 h-3.5 bg-orange-500 rounded-full border-2 border-white z-10 shadow-lg flex items-center justify-center text-[9px] font-bold">🔥</div>
  </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/** Dark green dot with ranger emoji — forest ranger patrol */
export const rangerIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-6 h-6">
    <div class="absolute w-full h-full bg-emerald-500 rounded-full opacity-40 animate-pulse"></div>
    <div class="w-3.5 h-3.5 bg-emerald-700 rounded-full border-2 border-white z-10 shadow-lg flex items-center justify-center text-[8px]">👮</div>
  </div>`,
  className: 'custom-leaflet-icon',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/** Operator emergency trekker — red pulsing */
export const emergencyTrekkerIcon = L.divIcon({
  html: `<div class="relative flex items-center justify-center w-6 h-6">
    <div class="absolute w-full h-full bg-red-500 rounded-full opacity-60 animate-ping"></div>
    <div class="w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white z-10 shadow-lg"></div>
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
