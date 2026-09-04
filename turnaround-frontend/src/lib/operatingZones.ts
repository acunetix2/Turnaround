export type OperatingZone = 'east_africa' | 'kenya' | 'uganda' | 'tanzania' | 'rwanda' | 'great_lakes';

export interface OperatingZoneDefinition {
  label: string;
  center: [number, number];
  zoom: number;
  polygon: [number, number][];
}

export const OPERATING_ZONES: Record<OperatingZone, OperatingZoneDefinition> = {
  east_africa: {
    label: 'East Africa',
    center: [37.2, -0.8],
    zoom: 5.8,
    polygon: [[29.0, -11.8], [42.5, -11.8], [42.5, 5.5], [29.0, 5.5], [29.0, -11.8]],
  },
  kenya: {
    label: 'Kenya',
    center: [37.9, 0.4],
    zoom: 6.2,
    polygon: [[33.8, -4.8], [41.9, -4.8], [41.9, 5.2], [33.8, 5.2], [33.8, -4.8]],
  },
  uganda: {
    label: 'Uganda',
    center: [32.3, 1.4],
    zoom: 6.5,
    polygon: [[29.5, -1.6], [35.1, -1.6], [35.1, 4.3], [29.5, 4.3], [29.5, -1.6]],
  },
  tanzania: {
    label: 'Tanzania',
    center: [34.8, -6.2],
    zoom: 5.8,
    polygon: [[29.3, -11.8], [40.5, -11.8], [40.5, -1.0], [29.3, -1.0], [29.3, -11.8]],
  },
  rwanda: {
    label: 'Rwanda',
    center: [29.9, -1.9],
    zoom: 8.2,
    polygon: [[28.8, -2.9], [30.9, -2.9], [30.9, -1.0], [28.8, -1.0], [28.8, -2.9]],
  },
  great_lakes: {
    label: 'Great Lakes Region',
    center: [31.8, -1.5],
    zoom: 5.8,
    polygon: [[27.5, -5.0], [36.5, -5.0], [36.5, 5.0], [27.5, 5.0], [27.5, -5.0]],
  },
};

export function getOperatingZone(zone?: string): OperatingZoneDefinition {
  return OPERATING_ZONES[(zone as OperatingZone) || 'east_africa'] || OPERATING_ZONES.east_africa;
}
