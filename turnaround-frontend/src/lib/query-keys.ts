/**
 * Centralized React Query key factory.
 * All useQuery / useMutation calls reference these to avoid string typos
 * and make cache invalidation predictable.
 */
export const queryKeys = {
  // Dashboard
  dashboard: () => ['dashboard'] as const,

  // Vehicles
  vehicles: {
    all: () => ['vehicles'] as const,
    detail: (id: string) => ['vehicles', id] as const,
    dwells: (id: string) => ['vehicles', id, 'dwells'] as const,
    stats: () => ['vehicles', 'stats'] as const,
  },

  // Locations
  locations: {
    all: () => ['locations'] as const,
    detail: (id: string) => ['locations', id] as const,
    stats: () => ['locations', 'stats'] as const,
  },

  // Insights
  insights: {
    all: () => ['insights'] as const,
  },

  // Analytics / trends
  analytics: {
    trends: () => ['analytics', 'trends'] as const,
  },

  // Live map
  liveMap: {
    gpsEvents: () => ['liveMap', 'gpsEvents'] as const,
  },

  // Trips
  trips: {
    all: () => ['trips'] as const,
    detail: (id: string) => ['trips', id] as const,
  },

  // Gate Passes
  gatePasses: {
    all: () => ['gatePasses'] as const,
    detail: (id: string) => ['gatePasses', id] as const,
    byVehicle: (vehicleId: string) => ['gatePasses', 'vehicle', vehicleId] as const,
    byTrip: (tripId: string) => ['gatePasses', 'trip', tripId] as const,
  },

  // Delay Charges (Demurrage)
  delayCharges: {
    all: () => ['delayChargeClaims'] as const,
    detail: (id: string) => ['delayChargeClaims', id] as const,
  },};
