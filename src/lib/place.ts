// Where the Maghrib-timed themes are reckoned from: the host's or player's own location.
// Order of preference: a location the player chose to share (kept only on this device),
// then the main city of the device's time zone, then a guess from the clock's UTC offset.

export type Place = { lat: number; lon: number; label: string; exact: boolean }

const KEY = 'gg.place.v1'

/** Main city of common time zones: [lat, lon, name]. */
const ZONES: Record<string, [number, number, string]> = {
  'Asia/Riyadh': [24.7136, 46.6753, 'Riyadh'], 'Asia/Kuwait': [29.3759, 47.9774, 'Kuwait City'], 'Asia/Bahrain': [26.2285, 50.586, 'Manama'],
  'Asia/Qatar': [25.2854, 51.531, 'Doha'], 'Asia/Dubai': [25.2048, 55.2708, 'Dubai'], 'Asia/Muscat': [23.588, 58.3829, 'Muscat'],
  'Asia/Aden': [12.7855, 45.0187, 'Aden'], 'Asia/Baghdad': [33.3152, 44.3661, 'Baghdad'], 'Asia/Amman': [31.9539, 35.9106, 'Amman'],
  'Asia/Damascus': [33.5138, 36.2765, 'Damascus'], 'Asia/Beirut': [33.8938, 35.5018, 'Beirut'], 'Asia/Jerusalem': [31.7683, 35.2137, 'al-Quds'],
  'Asia/Gaza': [31.5017, 34.4668, 'Gaza'], 'Asia/Hebron': [31.5326, 35.0998, 'al-Khalil'], 'Asia/Tehran': [35.6892, 51.389, 'Tehran'],
  'Europe/Istanbul': [41.0082, 28.9784, 'Istanbul'], 'Asia/Baku': [40.4093, 49.8671, 'Baku'], 'Asia/Tbilisi': [41.7151, 44.8271, 'Tbilisi'],
  'Asia/Yerevan': [40.1792, 44.4991, 'Yerevan'], 'Asia/Kabul': [34.5553, 69.2075, 'Kabul'], 'Asia/Karachi': [24.8607, 67.0011, 'Karachi'],
  'Asia/Kolkata': [28.6139, 77.209, 'Delhi'], 'Asia/Calcutta': [28.6139, 77.209, 'Delhi'], 'Asia/Dhaka': [23.8103, 90.4125, 'Dhaka'],
  'Asia/Colombo': [6.9271, 79.8612, 'Colombo'], 'Asia/Kathmandu': [27.7172, 85.324, 'Kathmandu'], 'Indian/Maldives': [4.1755, 73.5093, 'Malé'],
  'Asia/Tashkent': [41.2995, 69.2401, 'Tashkent'], 'Asia/Samarkand': [39.6542, 66.9597, 'Samarkand'], 'Asia/Dushanbe': [38.5598, 68.787, 'Dushanbe'],
  'Asia/Bishkek': [42.8746, 74.5698, 'Bishkek'], 'Asia/Almaty': [43.222, 76.8512, 'Almaty'], 'Asia/Ashgabat': [37.9601, 58.3261, 'Ashgabat'],
  'Asia/Jakarta': [-6.2088, 106.8456, 'Jakarta'], 'Asia/Makassar': [-5.1477, 119.4327, 'Makassar'], 'Asia/Jayapura': [-2.5916, 140.669, 'Jayapura'],
  'Asia/Kuala_Lumpur': [3.139, 101.6869, 'Kuala Lumpur'], 'Asia/Singapore': [1.3521, 103.8198, 'Singapore'], 'Asia/Brunei': [4.9031, 114.9398, 'Bandar Seri Begawan'],
  'Asia/Manila': [14.5995, 120.9842, 'Manila'], 'Asia/Bangkok': [13.7563, 100.5018, 'Bangkok'], 'Asia/Shanghai': [39.9042, 116.4074, 'Beijing'],
  'Asia/Urumqi': [43.8256, 87.6168, 'Ürümqi'], 'Asia/Hong_Kong': [22.3193, 114.1694, 'Hong Kong'], 'Asia/Tokyo': [35.6762, 139.6503, 'Tokyo'],
  'Asia/Seoul': [37.5665, 126.978, 'Seoul'], 'Australia/Sydney': [-33.8688, 151.2093, 'Sydney'], 'Australia/Melbourne': [-37.8136, 144.9631, 'Melbourne'],
  'Australia/Perth': [-31.9505, 115.8605, 'Perth'], 'Pacific/Auckland': [-36.8485, 174.7633, 'Auckland'],
  'Africa/Cairo': [30.0444, 31.2357, 'Cairo'], 'Africa/Khartoum': [15.5007, 32.5599, 'Khartoum'], 'Africa/Tripoli': [32.8872, 13.1913, 'Tripoli'],
  'Africa/Tunis': [36.8065, 10.1815, 'Tunis'], 'Africa/Algiers': [36.7538, 3.0588, 'Algiers'], 'Africa/Casablanca': [33.5731, -7.5898, 'Casablanca'],
  'Africa/Nouakchott': [18.0735, -15.9582, 'Nouakchott'], 'Africa/Dakar': [14.7167, -17.4677, 'Dakar'], 'Africa/Bamako': [12.6392, -8.0029, 'Bamako'],
  'Africa/Niamey': [13.5116, 2.1254, 'Niamey'], 'Africa/Lagos': [6.5244, 3.3792, 'Lagos'], 'Africa/Ndjamena': [12.1348, 15.0557, "N'Djamena"],
  'Africa/Accra': [5.6037, -0.187, 'Accra'], 'Africa/Abidjan': [5.36, -4.0083, 'Abidjan'], 'Africa/Conakry': [9.6412, -13.5784, 'Conakry'],
  'Africa/Banjul': [13.4549, -16.579, 'Banjul'], 'Africa/Freetown': [8.4657, -13.2317, 'Freetown'], 'Africa/Ouagadougou': [12.3714, -1.5197, 'Ouagadougou'],
  'Africa/Addis_Ababa': [9.03, 38.74, 'Addis Ababa'], 'Africa/Djibouti': [11.5721, 43.1456, 'Djibouti'], 'Africa/Mogadishu': [2.0469, 45.3182, 'Mogadishu'],
  'Africa/Nairobi': [-1.2921, 36.8219, 'Nairobi'], 'Africa/Dar_es_Salaam': [-6.7924, 39.2083, 'Dar es Salaam'], 'Africa/Kampala': [0.3476, 32.5825, 'Kampala'],
  'Indian/Comoro': [-11.7172, 43.2473, 'Moroni'], 'Africa/Johannesburg': [-26.2041, 28.0473, 'Johannesburg'], 'Indian/Mauritius': [-20.1609, 57.5012, 'Port Louis'],
  'Europe/London': [51.5074, -0.1278, 'London'], 'Europe/Dublin': [53.3498, -6.2603, 'Dublin'], 'Europe/Paris': [48.8566, 2.3522, 'Paris'],
  'Europe/Brussels': [50.8503, 4.3517, 'Brussels'], 'Europe/Amsterdam': [52.3676, 4.9041, 'Amsterdam'], 'Europe/Berlin': [52.52, 13.405, 'Berlin'],
  'Europe/Vienna': [48.2082, 16.3738, 'Vienna'], 'Europe/Zurich': [47.3769, 8.5417, 'Zurich'], 'Europe/Madrid': [40.4168, -3.7038, 'Madrid'],
  'Europe/Lisbon': [38.7223, -9.1393, 'Lisbon'], 'Europe/Rome': [41.9028, 12.4964, 'Rome'], 'Europe/Stockholm': [59.3293, 18.0686, 'Stockholm'],
  'Europe/Oslo': [59.9139, 10.7522, 'Oslo'], 'Europe/Copenhagen': [55.6761, 12.5683, 'Copenhagen'], 'Europe/Sarajevo': [43.8563, 18.4131, 'Sarajevo'],
  'Europe/Belgrade': [44.7866, 20.4489, 'Belgrade'], 'Europe/Skopje': [41.9981, 21.4254, 'Skopje'], 'Europe/Tirane': [41.3275, 19.8187, 'Tirana'],
  'Europe/Sofia': [42.6977, 23.3219, 'Sofia'], 'Europe/Athens': [37.9838, 23.7275, 'Athens'], 'Europe/Bucharest': [44.4268, 26.1025, 'Bucharest'],
  'Europe/Warsaw': [52.2297, 21.0122, 'Warsaw'], 'Europe/Kiev': [50.4501, 30.5234, 'Kyiv'], 'Europe/Kyiv': [50.4501, 30.5234, 'Kyiv'],
  'Europe/Simferopol': [44.9521, 34.1024, 'Simferopol'], 'Europe/Moscow': [55.7558, 37.6173, 'Moscow'], 'Europe/Kazan': [55.7963, 49.1088, 'Kazan'],
  'Asia/Yekaterinburg': [56.8389, 60.6057, 'Yekaterinburg'], 'Europe/Samara': [53.1959, 50.1002, 'Samara'],
  'America/New_York': [40.7128, -74.006, 'New York'], 'America/Toronto': [43.6532, -79.3832, 'Toronto'], 'America/Chicago': [41.8781, -87.6298, 'Chicago'],
  'America/Detroit': [42.3314, -83.0458, 'Detroit'], 'America/Denver': [39.7392, -104.9903, 'Denver'], 'America/Phoenix': [33.4484, -112.074, 'Phoenix'],
  'America/Los_Angeles': [34.0522, -118.2437, 'Los Angeles'], 'America/Vancouver': [49.2827, -123.1207, 'Vancouver'], 'America/Mexico_City': [19.4326, -99.1332, 'Mexico City'],
  'America/Sao_Paulo': [-23.5505, -46.6333, 'São Paulo'], 'America/Argentina/Buenos_Aires': [-34.6037, -58.3816, 'Buenos Aires'],
  'America/Port_of_Spain': [10.6603, -61.5086, 'Port of Spain'], 'America/Guyana': [6.8013, -58.1551, 'Georgetown'], 'America/Paramaribo': [5.852, -55.2038, 'Paramaribo'],
}

function deviceZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || '' } catch { return '' }
}

/** The place Maghrib is reckoned from on this device. */
export function currentPlace(): Place {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw)
      // Older copies kept two decimals: read them back coarse, and re-save so the finer value is gone.
      if (Number.isFinite(p?.lat) && Number.isFinite(p?.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180) {
        if (coarse(p.lat) !== p.lat || coarse(p.lon) !== p.lon) savePlace(p.lat, p.lon)
        return { lat: coarse(p.lat), lon: coarse(p.lon), label: 'your location', exact: true }
      }
    }
  } catch { /* storage blocked: fall through */ }
  const zone = ZONES[deviceZone()]
  if (zone) return { lat: zone[0], lon: zone[1], label: zone[2], exact: false }
  // Unknown zone: the clock's offset gives roughly the longitude; a mid latitude is close enough for a sunset estimate.
  const off = -new Date().getTimezoneOffset() / 60
  return { lat: 25, lon: off * 15, label: 'your time zone', exact: false }
}

/**
 * Coordinates are rounded to 0.1 degree (about 11 km) before they are kept: plenty for a sunset time
 * (well under a minute off), but too coarse to point at a home or a building.
 * The place is never sent anywhere: it stays in this browser's storage until the player removes it.
 */
export const coarse = (x: number) => Math.round(x * 10) / 10

export function savePlace(lat: number, lon: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return
  try { localStorage.setItem(KEY, JSON.stringify({ lat: coarse(lat), lon: coarse(lon) })) } catch { /* ignore */ }
}

export function clearPlace() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}

/**
 * Ask the browser for the device's location once, only after the player has read what it is for and agreed.
 * Low accuracy is enough (no GPS needed), and the browser's own permission prompt still applies.
 */
export function requestExactPlace(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(false)
    navigator.geolocation.getCurrentPosition(
      (pos) => { savePlace(pos.coords.latitude, pos.coords.longitude); resolve(true) },
      () => resolve(false),
      { enableHighAccuracy: false, maximumAge: 7 * 86400_000, timeout: 15000 },
    )
  })
}
