import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TileCoordinate {
  z: number;
  x: number;
  y: number;
}

export interface GPSCoordinate {
  lat: number;
  lng: number;
}

// Convert longitude to tile X coordinate
export function lon2tile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

// Convert latitude to tile Y coordinate
export function lat2tile(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  );
}

// Get the local file system URI for a specific tile
export function getLocalTileUri(z: number, x: number, y: number): string {
  return `${FileSystem.documentDirectory}tiles/${z}/${x}/${y}.png`;
}

// Ensure the directory for a specific tile exists
async function ensureTileDirExists(z: number, x: number): Promise<void> {
  const dir = `${FileSystem.documentDirectory}tiles/${z}/${x}`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

// Get unique tiles needed for a given route across zoom levels
export function getTilesForRoute(
  routePoints: GPSCoordinate[],
  zoomLevels: number[] = [13, 14, 15, 16],
  radius: number = 0
): TileCoordinate[] {
  const tileSet = new Set<string>();
  const tiles: TileCoordinate[] = [];

  for (const zoom of zoomLevels) {
    const currentRadius = (zoom === 13 && radius > 0) ? radius + 1 : radius;

    for (const point of routePoints) {
      const centerX = lon2tile(point.lng, zoom);
      const centerY = lat2tile(point.lat, zoom);

      for (let dx = -currentRadius; dx <= currentRadius; dx++) {
        for (let dy = -currentRadius; dy <= currentRadius; dy++) {
          const x = centerX + dx;
          const y = centerY + dy;
          const key = `${zoom}_${x}_${y}`;
          if (!tileSet.has(key)) {
            tileSet.add(key);
            tiles.push({ z: zoom, x, y });
          }
        }
      }
    }
  }

  return tiles;
}

// Get unique tiles needed for a bounding box bounds across zoom levels
export function getTilesForBounds(
  latMin: number,
  latMax: number,
  lngMin: number,
  lngMax: number,
  zoomLevels: number[] = [12, 13, 14, 15, 16]
): TileCoordinate[] {
  const tiles: TileCoordinate[] = [];

  for (const zoom of zoomLevels) {
    const xMin = lon2tile(lngMin, zoom);
    const xMax = lon2tile(lngMax, zoom);
    const yMin = lat2tile(latMax, zoom);
    const yMax = lat2tile(latMin, zoom);

    const startX = Math.min(xMin, xMax);
    const endX = Math.max(xMin, xMax);
    const startY = Math.min(yMin, yMax);
    const endY = Math.max(yMin, yMax);

    // Safety limit per zoom level
    const width = endX - startX + 1;
    const height = endY - startY + 1;
    if (width * height > 4000) {
      continue; // Skip zoom level if bounding box is way too wide
    }

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        tiles.push({ z: zoom, x, y });
      }
    }
  }

  return tiles;
}

// Download a single tile if it does not already exist
export async function downloadTile(z: number, x: number, y: number): Promise<boolean> {
  const localUri = getLocalTileUri(z, x, y);
  
  try {
    const tileInfo = await FileSystem.getInfoAsync(localUri);
    if (tileInfo.exists && tileInfo.size > 0) {
      return true;
    }

    await ensureTileDirExists(z, x);

    // Download from OpenStreetMap tile server
    const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    
    await FileSystem.downloadAsync(url, localUri, {
      headers: {
        'User-Agent': 'RescueLinkApp/1.0 (Mobile App)'
      }
    });
    return true;
  } catch (error) {
    console.warn(`Failed to download tile z=${z}, x=${x}, y=${y}:`, error);
    return false;
  }
}

// Download all tiles along a route with progress reporting
export async function downloadRouteTiles(
  routePoints: GPSCoordinate[],
  onProgress?: (progress: number) => void
): Promise<{ total: number; downloaded: number; skipped: number; failed: number }> {
  if (routePoints.length === 0) {
    if (onProgress) onProgress(1);
    return { total: 0, downloaded: 0, skipped: 0, failed: 0 };
  }

  const allTiles = getTilesForRoute(routePoints, [13, 14, 15, 16], 1);
  const maxTiles = 1500;
  const tilesToDownload = allTiles.slice(0, maxTiles);
  const total = tilesToDownload.length;
  
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  const batchSize = 6;
  for (let i = 0; i < total; i += batchSize) {
    const batch = tilesToDownload.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (tile) => {
        const localUri = getLocalTileUri(tile.z, tile.x, tile.y);
        try {
          const tileInfo = await FileSystem.getInfoAsync(localUri);
          if (tileInfo.exists && tileInfo.size > 0) {
            skipped++;
          } else {
            const success = await downloadTile(tile.z, tile.x, tile.y);
            if (success) {
              downloaded++;
            } else {
              failed++;
            }
          }
        } catch (e) {
          failed++;
        }
      })
    );
    
    const completed = i + batch.length;
    if (onProgress) {
      onProgress(completed / total);
    }
  }

  if (onProgress) onProgress(1);

  return { total, downloaded, skipped, failed };
}

// Download bounds tiles (custom selected region in bounding box selector)
export async function downloadBoundsTiles(
  latMin: number,
  latMax: number,
  lngMin: number,
  lngMax: number,
  onProgress?: (progress: number) => void
): Promise<{ total: number; downloaded: number; skipped: number; failed: number }> {
  const allTiles = getTilesForBounds(latMin, latMax, lngMin, lngMax, [12, 13, 14, 15, 16]);
  const total = allTiles.length;
  
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  const batchSize = 6;
  for (let i = 0; i < total; i += batchSize) {
    const batch = allTiles.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (tile) => {
        const localUri = getLocalTileUri(tile.z, tile.x, tile.y);
        try {
          const tileInfo = await FileSystem.getInfoAsync(localUri);
          if (tileInfo.exists && tileInfo.size > 0) {
            skipped++;
          } else {
            const success = await downloadTile(tile.z, tile.x, tile.y);
            if (success) {
              downloaded++;
            } else {
              failed++;
            }
          }
        } catch (e) {
          failed++;
        }
      })
    );
    
    const completed = i + batch.length;
    if (onProgress) {
      onProgress(completed / total);
    }
  }

  if (onProgress) onProgress(1);

  return { total, downloaded, skipped, failed };
}

// Clean up downloaded tiles directory to free space
export async function clearOfflineTiles(): Promise<void> {
  const dir = `${FileSystem.documentDirectory}tiles`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (dirInfo.exists) {
    await FileSystem.deleteAsync(dir, { idempotent: true });
  }
}
