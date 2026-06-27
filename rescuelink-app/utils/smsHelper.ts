export function buildBatterySosMessage(batteryLevel: number, lat: number, lng: number, timeStr: string): string {
  return `[SOS PIN YEU ${batteryLevel}%] Vi tri: https://maps.google.com/?q=${lat},${lng} luc ${timeStr}`;
}

export function buildCheckinFailedMessage(routeName: string, lat: number, lng: number): string {
  return `[CANH BAO MAT LIEN LAC] Hanh trinh ${routeName} - Thanh vien da ngung di chuyen va khong phan hoi check-in tai: https://maps.google.com/?q=${lat},${lng}`;
}

export function buildCircularAnomalyMessage(totalDistance: number, displacement: number, lat: number, lng: number): string {
  return `[AI CANH BAO LAC DUONG] Thanh vien da di vong tron (di chuyen ${Math.round(totalDistance)}m nhung chi cach diem 30p truoc ${Math.round(displacement)}m) tai: https://maps.google.com/?q=${lat},${lng}`;
}

export function buildDeviationAnomalyMessage(devDistance: number, lat: number, lng: number): string {
  return `[AI CANH BAO LAC DUONG] Thanh vien da lech cung duong dang ky ${Math.round(devDistance)}m tai: https://maps.google.com/?q=${lat},${lng}`;
}

export function buildCompressedSosMessage(lat: number, lng: number): string {
  return `SOS RescueLink! maps.google.com/?q=${lat.toFixed(5)},${lng.toFixed(5)}`;
}

