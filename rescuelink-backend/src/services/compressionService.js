/**
 * Calculate Haversine distance in meters between two GPS coordinates
 * @param {object} p1 - { lat, lng }
 * @param {object} p2 - { lat, lng }
 * @returns {number} Distance in meters
 */
const haversineDistance = (p1, p2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculate perpendicular distance from point p to the line segment between p1 and p2
 * using Heron's formula based on geographical Haversine distances
 * @param {object} p - Point to measure { lat, lng }
 * @param {object} p1 - Start line point { lat, lng }
 * @param {object} p2 - End line point { lat, lng }
 * @returns {number} Distance in meters
 */
const getPerpendicularDistance = (p, p1, p2) => {
  const a = haversineDistance(p1, p);
  const b = haversineDistance(p2, p);
  const c = haversineDistance(p1, p2);

  // If line segment is effectively a single point, return distance to that point
  if (c < 0.1) {
    return a;
  }

  // Use Heron's formula to find the area of the triangle
  const s = (a + b + c) / 2;
  const areaSq = s * (s - a) * (s - b) * (s - c);
  
  // Guard against tiny precision errors giving negative numbers inside sqrt
  const area = areaSq > 0 ? Math.sqrt(areaSq) : 0;

  // Height = 2 * Area / Base (where Base is c, the distance from p1 to p2)
  return (2 * area) / c;
};

/**
 * Ramer-Douglas-Peucker GPS compression algorithm
 * Recursively simplifies a curve of points based on distance threshold
 * @param {Array} points - Array of points e.g. [{ lat, lng, recordedAt, battery }]
 * @param {number} epsilon - Distance threshold in meters (default 10)
 * @returns {Array} Compressed array of points
 */
const rdpCompress = (points, epsilon = 10) => {
  if (points.length <= 2) {
    return points;
  }

  const startIdx = 0;
  const endIdx = points.length - 1;
  const p1 = points[startIdx];
  const p2 = points[endIdx];

  let maxDist = 0;
  let maxIdx = 0;

  // Find the point with the maximum perpendicular distance from the line
  for (let i = startIdx + 1; i < endIdx; i++) {
    const dist = getPerpendicularDistance(points[i], p1, p2);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  // If the max distance is greater than epsilon, split and simplify recursively
  if (maxDist > epsilon) {
    const firstHalf = rdpCompress(points.slice(startIdx, maxIdx + 1), epsilon);
    const secondHalf = rdpCompress(points.slice(maxIdx, endIdx + 1), epsilon);
    
    // Concat firstHalf and secondHalf, removing the duplicate point at the boundary
    return firstHalf.slice(0, firstHalf.length - 1).concat(secondHalf);
  }

  // Otherwise, the segment is simplified to just start and end points
  return [p1, p2];
};

module.exports = {
  haversineDistance,
  getPerpendicularDistance,
  rdpCompress
};
