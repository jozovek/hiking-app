/**
 * Trail data model
 */
export interface Trail {
  id: number;
  name: string;
  description: string;
  length: number; // in miles
  difficulty: 'Easy' | 'Moderate' | 'Difficult';
  elevation_gain: number; // in feet
  route_type: 'Loop' | 'Out & Back' | 'Point to Point';
  latitude: number;
  longitude: number;
  park_id: number | null;
  surface_type: string;
  is_accessible: boolean;
  estimated_time: number; // in minutes
  created_at: string;
  updated_at: string;
  geometry: string; // GeoJSON string for the trail path
  image_url: string | null;
}

/**
 * Park data model
 */
export interface Park {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string | null;
  website: string | null;
  hours: string | null;
  amenities: string; // JSON string of amenities
  created_at: string;
  updated_at: string;
  geometry: string; // GeoJSON string for the park boundary
  image_url: string | null;
}

/**
 * Point of Interest data model
 */
export interface POI {
  id: number;
  name: string;
  description: string;
  type: 'Viewpoint' | 'Waterfall' | 'Historic' | 'Natural' | 'Other';
  latitude: number;
  longitude: number;
  trail_id: number;
  created_at: string;
  updated_at: string;
  image_url: string | null;
}

/**
 * User settings model
 */
export interface UserSettings {
  id: number;
  preferred_units: 'imperial' | 'metric';
  dark_mode: boolean;
  offline_maps_enabled: boolean;
  notification_enabled: boolean;
  last_sync: string;
}

/**
 * Saved trail model
 */
export interface SavedTrail {
  id: number;
  trail_id: number;
  saved_at: string;
  notes: string | null;
}

/**
 * Trail history model
 */
export interface TrailHistory {
  id: number;
  trail_id: number;
  visited_at: string;
  completed: boolean;
  duration: number | null; // in minutes
  notes: string | null;
}
