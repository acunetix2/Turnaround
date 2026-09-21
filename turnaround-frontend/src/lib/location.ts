export type CoordinatesLike = {
  latitude?: number | null;
  longitude?: number | null;
};

export type RouteStopLike = {
  latitude?: number | null;
  longitude?: number | null;
  name?: string | null;
};

export const hasValidGps = (gps?: CoordinatesLike | null): gps is Required<CoordinatesLike> => {
  return !!gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude);
};

export const formatGpsCoordinates = (gps?: CoordinatesLike | null): string | null => {
  if (!hasValidGps(gps)) return null;
  return `${gps.latitude.toFixed(4)}, ${gps.longitude.toFixed(4)}`;
};

export const getVehicleLocationLabel = (
  vehicle?: { current_location_name?: string | null },
  gps?: CoordinatesLike | null,
): string => {
  const namedLocation = vehicle?.current_location_name?.trim();
  if (namedLocation) return namedLocation;

  if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
    return 'Current location';
  }

  if (gps && (gps.latitude != null || gps.longitude != null)) return 'Last known location';
  return 'GPS signal lost';
};

export const getMotionStatus = (
  vehicle?: { status?: string | null },
  gps?: { speed?: number | null } | null,
): 'in_transit' | 'delayed' | 'maintenance' | 'idle' => {
  if (vehicle?.status === 'delayed') return 'delayed';
  if (vehicle?.status === 'maintenance') return 'maintenance';

  const speed = Number(gps?.speed);
  if (Number.isFinite(speed) && speed > 5) return 'in_transit';

  return 'idle';
};

export const resolveRouteContext = (
  params: {
    originLat?: number;
    originLng?: number;
    destLat?: number;
    destLng?: number;
    originName?: string | null;
    destName?: string | null;
  },
  trip?: {
    origin?: RouteStopLike | null;
    destination?: RouteStopLike | null;
    origin_name?: string | null;
    destination_name?: string | null;
  } | null,
) => {
  const originLat = Number.isFinite(params.originLat) ? params.originLat : trip?.origin?.latitude ?? NaN;
  const originLng = Number.isFinite(params.originLng) ? params.originLng : trip?.origin?.longitude ?? NaN;
  const destLat = Number.isFinite(params.destLat) ? params.destLat : trip?.destination?.latitude ?? NaN;
  const destLng = Number.isFinite(params.destLng) ? params.destLng : trip?.destination?.longitude ?? NaN;
  const originName = params.originName || trip?.origin_name || trip?.origin?.name || null;
  const destName = params.destName || trip?.destination_name || trip?.destination?.name || null;

  return {
    originLat,
    originLng,
    destLat,
    destLng,
    originName,
    destName,
    hasRoute: Number.isFinite(originLat) && Number.isFinite(originLng) && Number.isFinite(destLat) && Number.isFinite(destLng),
  };
};
