import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Navigation, Compass, Sparkles } from 'lucide-react';
import type { LocationType } from '../../lib/api/types';

export interface LocationPreset {
  name: string;
  location_type: LocationType;
  latitude: number;
  longitude: number;
  geofence_radius: number;
  expected_dwell_minutes: number;
  category: 'port' | 'border' | 'depot' | 'warehouse';
  country: string;
}

export const COMMON_TERMINAL_PRESETS: LocationPreset[] = [
  // Ports
  {
    name: 'Kilindini Port (Mombasa Harbor)',
    location_type: 'port',
    latitude: -4.0547,
    longitude: 39.6636,
    geofence_radius: 1200,
    expected_dwell_minutes: 180,
    category: 'port',
    country: 'Kenya'
  },
  {
    name: 'Kisumu Port & Oil Pier',
    location_type: 'port',
    latitude: -0.1022,
    longitude: 34.7523,
    geofence_radius: 750,
    expected_dwell_minutes: 120,
    category: 'port',
    country: 'Kenya'
  },
  {
    name: 'Port of Dar es Salaam',
    location_type: 'port',
    latitude: -6.8285,
    longitude: 39.2968,
    geofence_radius: 1500,
    expected_dwell_minutes: 180,
    category: 'port',
    country: 'Tanzania'
  },

  // Inland Container Depots (ICD)
  {
    name: 'Nairobi ICD (Embakasi Terminal)',
    location_type: 'depot',
    latitude: -1.3328,
    longitude: 36.8850,
    geofence_radius: 800,
    expected_dwell_minutes: 90,
    category: 'depot',
    country: 'Kenya'
  },
  {
    name: 'Naivasha Inland Container Depot',
    location_type: 'depot',
    latitude: -0.7172,
    longitude: 36.4310,
    geofence_radius: 800,
    expected_dwell_minutes: 90,
    category: 'depot',
    country: 'Kenya'
  },
  {
    name: 'Kampala ICD (Bweyogerere)',
    location_type: 'depot',
    latitude: 0.3546,
    longitude: 32.6599,
    geofence_radius: 700,
    expected_dwell_minutes: 120,
    category: 'depot',
    country: 'Uganda'
  },
  {
    name: 'Eldoret Pipeline Transit Yard',
    location_type: 'depot',
    latitude: 0.5143,
    longitude: 35.2698,
    geofence_radius: 500,
    expected_dwell_minutes: 60,
    category: 'depot',
    country: 'Kenya'
  },
  {
    name: 'Tororo Inland Transit Depot',
    location_type: 'depot',
    latitude: 0.6929,
    longitude: 34.1809,
    geofence_radius: 500,
    expected_dwell_minutes: 90,
    category: 'depot',
    country: 'Uganda'
  },

  // Border Crossings (OSBP)
  {
    name: 'Malaba OSBP (Kenya-Uganda)',
    location_type: 'border_crossing',
    latitude: 0.6341,
    longitude: 34.2755,
    geofence_radius: 650,
    expected_dwell_minutes: 120,
    category: 'border',
    country: 'Kenya / Uganda'
  },
  {
    name: 'Busia OSBP (Kenya-Uganda)',
    location_type: 'border_crossing',
    latitude: 0.4608,
    longitude: 34.1115,
    geofence_radius: 500,
    expected_dwell_minutes: 100,
    category: 'border',
    country: 'Kenya / Uganda'
  },
  {
    name: 'Namanga OSBP (Kenya-Tanzania)',
    location_type: 'border_crossing',
    latitude: -2.5448,
    longitude: 36.7905,
    geofence_radius: 600,
    expected_dwell_minutes: 90,
    category: 'border',
    country: 'Kenya / Tanzania'
  },
  {
    name: 'Mutukula OSBP (Uganda-Tanzania)',
    location_type: 'border_crossing',
    latitude: -1.0000,
    longitude: 31.4167,
    geofence_radius: 600,
    expected_dwell_minutes: 120,
    category: 'border',
    country: 'Uganda / Tanzania'
  },
  {
    name: 'Katuna / Gatuna OSBP (Uganda-Rwanda)',
    location_type: 'border_crossing',
    latitude: -1.4286,
    longitude: 30.0125,
    geofence_radius: 500,
    expected_dwell_minutes: 90,
    category: 'border',
    country: 'Uganda / Rwanda'
  },

  // Warehouses & Industrial Parks
  {
    name: 'Athi River Logistics Park',
    location_type: 'warehouse',
    latitude: -1.4583,
    longitude: 36.9833,
    geofence_radius: 600,
    expected_dwell_minutes: 75,
    category: 'warehouse',
    country: 'Kenya'
  },
  {
    name: 'Nakuru Transit Hub',
    location_type: 'warehouse',
    latitude: -0.3031,
    longitude: 36.0800,
    geofence_radius: 500,
    expected_dwell_minutes: 60,
    category: 'warehouse',
    country: 'Kenya'
  },
  {
    name: 'Mlolongo Weighbridge & Staging Yard',
    location_type: 'loading_point',
    latitude: -1.3854,
    longitude: 36.9387,
    geofence_radius: 450,
    expected_dwell_minutes: 45,
    category: 'warehouse',
    country: 'Kenya'
  }
];

interface LocationMapPickerProps {
  latitude: number;
  longitude: number;
  geofenceRadius: number;
  onSelectCoordinates: (lat: number, lng: number) => void;
  onSelectPreset?: (preset: LocationPreset) => void;
  onSelectSearchResult?: (name: string, lat: number, lng: number) => void;
}

export const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  latitude,
  longitude,
  geofenceRadius,
  onSelectCoordinates,
  onSelectPreset,
  onSelectSearchResult
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'port' | 'depot' | 'border' | 'warehouse'>('all');
  const [showPresetsDropdown, setShowPresetsDropdown] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialLat = Number.isFinite(latitude) && latitude !== 0 ? latitude : -1.2921;
    const initialLng = Number.isFinite(longitude) && longitude !== 0 ? longitude : 36.8219;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 11,
      zoomControl: true,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      className: 'leaflet-map-tiles'
    }).addTo(map);

    // FedEx styled pin (Corporate purple + Express orange)
    const markerIcon = L.divIcon({
      className: 'custom-map-picker-pin',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(237,100,43,0.3); animation: ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>
          <div style="position: relative; width: 24px; height: 24px; border-radius: 50%; background: #ED642B; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(37,12,119,0.5); display: flex; align-items: center; justify-content: center;">
            <div style="width: 7px; height: 7px; border-radius: 50%; background: #250C77;"></div>
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const marker = L.marker([initialLat, initialLng], {
      icon: markerIcon,
      draggable: true
    }).addTo(map);

    const circle = L.circle([initialLat, initialLng], {
      radius: geofenceRadius || 500,
      color: '#ED642B',
      fillColor: '#ED642B',
      fillOpacity: 0.18,
      weight: 2.5,
      dashArray: '5, 5'
    }).addTo(map);

    markerRef.current = marker;
    circleRef.current = circle;
    mapRef.current = map;

    // Handle click on map to move pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = parseFloat(e.latlng.lat.toFixed(5));
      const lng = parseFloat(e.latlng.lng.toFixed(5));
      marker.setLatLng([lat, lng]);
      circle.setLatLng([lat, lng]);
      onSelectCoordinates(lat, lng);
    });

    // Handle marker drag
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      const lat = parseFloat(pos.lat.toFixed(5));
      const lng = parseFloat(pos.lng.toFixed(5));
      circle.setLatLng([lat, lng]);
      onSelectCoordinates(lat, lng);
    });

    // Fix render size
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update marker and circle position when props change
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || !circleRef.current) return;
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      const currentPos = markerRef.current.getLatLng();
      if (Math.abs(currentPos.lat - latitude) > 0.0001 || Math.abs(currentPos.lng - longitude) > 0.0001) {
        markerRef.current.setLatLng([latitude, longitude]);
        circleRef.current.setLatLng([latitude, longitude]);
        mapRef.current.setView([latitude, longitude], Math.max(mapRef.current.getZoom(), 12), { animate: true });
      }
    }
  }, [latitude, longitude]);

  // Update circle radius when prop changes
  useEffect(() => {
    if (!circleRef.current) return;
    if (geofenceRadius > 0) {
      circleRef.current.setRadius(geofenceRadius);
    }
  }, [geofenceRadius]);

  // Nominatim Search
  const handleSearchAddress = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=ke,ug,tz,rw,ss`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (resp.ok) {
        const data = await resp.json();
        setSearchResults(data);
      }
    } catch {
      // Network fallback
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSelectSearchResultItem = (res: { lat: string; lon: string; display_name: string }) => {
    const lat = parseFloat(parseFloat(res.lat).toFixed(5));
    const lng = parseFloat(parseFloat(res.lon).toFixed(5));
    // Clean, readable place name
    const cleanName = res.display_name.split(',')[0].trim();

    if (onSelectSearchResult) {
      onSelectSearchResult(cleanName, lat, lng);
    } else {
      onSelectCoordinates(lat, lng);
    }

    if (mapRef.current && markerRef.current && circleRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      circleRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], 13, { animate: true });
    }
    setSearchResults([]);
    setSearchQuery(cleanName);
  };

  const handleSelectPresetItem = (preset: LocationPreset) => {
    if (onSelectPreset) {
      onSelectPreset(preset);
    } else {
      onSelectCoordinates(preset.latitude, preset.longitude);
    }
    if (mapRef.current && markerRef.current && circleRef.current) {
      markerRef.current.setLatLng([preset.latitude, preset.longitude]);
      circleRef.current.setLatLng([preset.latitude, preset.longitude]);
      circleRef.current.setRadius(preset.geofence_radius);
      mapRef.current.setView([preset.latitude, preset.longitude], 13, { animate: true });
    }
    setSearchQuery(preset.name);
    setShowPresetsDropdown(false);
  };

  const filteredPresets = COMMON_TERMINAL_PRESETS.filter(p =>
    selectedCategory === 'all' || p.category === selectedCategory
  );

  return (
    <div className="space-y-3">
      {/* Top Search & Presets Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Live Search Input */}
        <div className="relative flex-1">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearchAddress(e.target.value);
              }}
              placeholder="Search stop or city (e.g. Mombasa Port, Nairobi ICD, Malaba)..."
              className="w-full bg-bg-surface-raised border border-border-default rounded-lg pl-9 pr-8 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-[#ED642B] focus:outline-none transition-colors font-medium"
            />
            {searching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-[#ED642B] border-t-transparent animate-spin" />
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-[2000] rounded-xl bg-bg-surface border border-border-strong shadow-2xl max-h-52 overflow-y-auto p-1.5 space-y-0.5">
              {searchResults.map((res, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectSearchResultItem(res)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-text-primary hover:bg-[#ED642B]/10 hover:text-[#ED642B] rounded-lg transition-colors cursor-pointer"
                >
                  <MapPin size={13} className="text-[#ED642B] shrink-0" />
                  <span className="truncate">{res.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Autofill Presets Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPresetsDropdown(!showPresetsDropdown)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#ED642B]/15 border border-[#ED642B]/35 hover:bg-[#ED642B]/25 text-[#ED642B] text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            <Sparkles size={13} />
            <span>Select Popular Terminal</span>
          </button>

          {/* Presets Popup Dropdown */}
          {showPresetsDropdown && (
            <div className="absolute right-0 top-full mt-1 z-[2000] w-72 sm:w-84 rounded-xl bg-bg-surface border border-border-strong shadow-2xl p-3 space-y-2.5">
              <div className="flex items-center justify-between border-b border-border-default pb-2">
                <span className="text-xs font-bold text-text-primary">East Africa Operating Hubs</span>
                <button
                  type="button"
                  onClick={() => setShowPresetsDropdown(false)}
                  className="text-text-tertiary hover:text-text-primary text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                {(['all', 'port', 'depot', 'border', 'warehouse'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-0.5 rounded text-[10.5px] font-semibold capitalize transition-colors cursor-pointer shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-[#ED642B] text-white shadow-sm'
                        : 'bg-bg-surface-raised text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Preset List */}
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                {filteredPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPresetItem(preset)}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-bg-surface-raised hover:bg-[#ED642B]/10 border border-border-default hover:border-[#ED642B]/40 text-left transition-colors cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-primary group-hover:text-[#ED642B] truncate">
                        {preset.name}
                      </p>
                      <p className="text-[10px] text-text-tertiary font-numeric">
                        {preset.country} • {preset.expected_dwell_minutes}m target • {preset.geofence_radius}m zone
                      </p>
                    </div>
                    <Navigation size={12} className="text-text-tertiary group-hover:text-[#ED642B] shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map Container */}
      <div className="relative rounded-xl border border-border-default overflow-hidden">
        <div
          ref={mapContainerRef}
          className="h-52 sm:h-60 w-full"
          style={{ background: 'var(--color-bg-canvas)' }}
        />

        {/* Map Click Hint */}
        <div className="absolute bottom-2.5 left-2.5 z-[1000] bg-bg-surface/90 backdrop-blur-md border border-border-default px-2.5 py-1 rounded-md text-[10.5px] font-semibold text-text-secondary flex items-center gap-1.5 shadow-sm">
          <Compass size={12} className="text-[#ED642B]" />
          <span>Click anywhere on map to set stop coordinates</span>
        </div>

        {/* Coordinate Badge */}
        <div className="absolute top-2.5 right-2.5 z-[1000] bg-bg-surface/90 backdrop-blur-md border border-border-default px-2.5 py-1 rounded-md text-[10px] font-numeric text-text-primary shadow-sm font-semibold">
          {Number.isFinite(latitude) ? latitude.toFixed(4) : '0.0000'}, {Number.isFinite(longitude) ? longitude.toFixed(4) : '0.0000'}
        </div>
      </div>
    </div>
  );
};
