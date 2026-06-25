export interface LatLng {
  lat: number;
  lng: number;
}

// Calculates Haversine distance between two points in meters
export function haversineDistance(p1: LatLng, p2: LatLng): number {
  const R = 6371e3; // Earth's radius in meters
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
      
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Finds the minimum distance in meters from a point to a route path (array of points)
export function distanceToRoute(point: LatLng, routePoints: LatLng[]): number {
  if (!routePoints || routePoints.length === 0) return 0;
  
  let minDistance = Infinity;
  
  for (const routePt of routePoints) {
    const dist = haversineDistance(point, routePt);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  
  return minDistance;
}
