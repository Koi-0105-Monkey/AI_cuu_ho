import * as FileSystem from 'expo-file-system/legacy';

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
  zoomLevels: number[] = [13, 14, 15]
): TileCoordinate[] {
  const tileSet = new Set<string>();
  const tiles: TileCoordinate[] = [];

  for (const zoom of zoomLevels) {
    for (const point of routePoints) {
      const x = lon2tile(point.lng, zoom);
      const y = lat2tile(point.lat, zoom);
      const key = `${zoom}_${x}_${y}`;
      if (!tileSet.has(key)) {
        tileSet.add(key);
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
    // If already exists and has non-zero size, skip downloading
    if (tileInfo.exists && tileInfo.size > 0) {
      return true;
    }

    await ensureTileDirExists(z, x);
    const osmUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    
    // Download from OSM
    await FileSystem.downloadAsync(osmUrl, localUri);
    return true;
  } catch (error) {
    console.warn(`Failed to download tile z=${z}, x=${x}, y=${y}:`, error);
    return false;
  }
}

// Download all tiles along a route with progress reporting
// Limit maximum downloaded tiles to 300 tiles (~6MB) to protect resources
export async function downloadRouteTiles(
  routePoints: GPSCoordinate[],
  onProgress?: (progress: number) => void
): Promise<{ total: number; downloaded: number; skipped: number; failed: number }> {
  if (routePoints.length === 0) {
    if (onProgress) onProgress(1);
    return { total: 0, downloaded: 0, skipped: 0, failed: 0 };
  }

  const allTiles = getTilesForRoute(routePoints);
  const maxTiles = 300;
  
  // If tiles exceed limit, slice to respect maximum resource limit
  const tilesToDownload = allTiles.slice(0, maxTiles);
  const total = tilesToDownload.length;
  
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  // Process tiles in batches of 5 to run concurrently but avoid overloading network
  const batchSize = 5;
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

  // Ensure progress reaches 100%
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
