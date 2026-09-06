export interface PointCoord {
  lat: number;
  lng: number;
  id: string;
  custom_id: string;
}

// គណនាចម្ងាយត្រង់រវាងចំណុចពីរ (Haversine Formula)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// តម្រៀបផ្ទះពីជិតទៅឆ្ងាយ (Nearest Neighbor Algorithm)
export function optimizeRouteOrder(start: { lat: number; lng: number }, points: PointCoord[], maxStops = 15): PointCoord[] {
  const unvisited = [...points];
  const route: PointCoord[] = [];
  let currentLoc = start;

  while (unvisited.length > 0 && route.length < maxStops) {
    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = calculateDistance(currentLoc.lat, currentLoc.lng, unvisited[i].lat, unvisited[i].lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }

    const nextStop = unvisited.splice(nearestIdx, 1)[0];
    route.push(nextStop);
    currentLoc = { lat: nextStop.lat, lng: nextStop.lng };
  }

  return route;
}

// ទាញយកខ្សែផ្លូវពិតប្រាកដតាមផ្លូវថ្នល់ពី OSRM Engine
export async function fetchOSRMRoute(coordinates: Array<[number, number]>) {
  if (coordinates.length < 2) return null;
  const coordString = coordinates.map(c => `${c[1]},${c[0]}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes?.[0]) {
      return data.routes[0].geometry;
    }
  } catch (err) {
    console.error('OSRM Routing Error:', err);
  }
  return null;
}