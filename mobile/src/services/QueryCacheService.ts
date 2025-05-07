// src/services/QueryCacheService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trail, Park, POI } from '../models/types';
import { useNetworkStatus } from '../providers/NetworkStatusProvider';

// Cache keys
const CACHE_PREFIX = 'query_cache_';
const TRAIL_CACHE_KEY = `${CACHE_PREFIX}trail_`;
const TRAILS_NEAR_CACHE_KEY = `${CACHE_PREFIX}trails_near_`;
const PARKS_NEAR_CACHE_KEY = `${CACHE_PREFIX}parks_near_`;
const POIS_CACHE_KEY = `${CACHE_PREFIX}pois_`;
const FILTERED_TRAILS_CACHE_KEY = `${CACHE_PREFIX}filtered_trails_`;

// Cache configuration
const DEFAULT_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_CACHE_ITEMS = 100; // Maximum number of items to keep in cache

// Cache item interface
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

/**
 * Service for caching database query results
 * This service provides caching for frequently accessed data to improve performance
 */
class QueryCacheService {
  private initialized: boolean = false;
  private cacheIndex: string[] = [];

  constructor() {
    this.init = this.init.bind(this);
    this.getTrailFromCache = this.getTrailFromCache.bind(this);
    this.cacheTrail = this.cacheTrail.bind(this);
    this.getTrailsNearFromCache = this.getTrailsNearFromCache.bind(this);
    this.cacheTrailsNear = this.cacheTrailsNear.bind(this);
    this.getParksNearFromCache = this.getParksNearFromCache.bind(this);
    this.cacheParksNear = this.cacheParksNear.bind(this);
    this.getPOIsFromCache = this.getPOIsFromCache.bind(this);
    this.cachePOIs = this.cachePOIs.bind(this);
    this.getFilteredTrailsFromCache = this.getFilteredTrailsFromCache.bind(this);
    this.cacheFilteredTrails = this.cacheFilteredTrails.bind(this);
    this.clearCache = this.clearCache.bind(this);
    this.pruneCache = this.pruneCache.bind(this);
  }

  /**
   * Initialize the cache service
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load cache index
      const cacheIndexJson = await AsyncStorage.getItem(`${CACHE_PREFIX}index`);
      if (cacheIndexJson) {
        this.cacheIndex = JSON.parse(cacheIndexJson);
      }

      // Prune expired items
      await this.pruneCache();

      this.initialized = true;
      console.log('Query cache service initialized successfully');
    } catch (error) {
      console.error('Error initializing query cache service:', error);
      // Don't throw error, just continue without caching
    }
  }

  /**
   * Save the cache index
   */
  private async saveCacheIndex(): Promise<void> {
    try {
      await AsyncStorage.setItem(`${CACHE_PREFIX}index`, JSON.stringify(this.cacheIndex));
    } catch (error) {
      console.error('Error saving cache index:', error);
    }
  }

  /**
   * Add a key to the cache index
   */
  private async addToIndex(key: string): Promise<void> {
    if (!this.cacheIndex.includes(key)) {
      this.cacheIndex.push(key);
      
      // If we've exceeded the max cache items, remove the oldest one
      if (this.cacheIndex.length > MAX_CACHE_ITEMS) {
        const oldestKey = this.cacheIndex.shift();
        if (oldestKey) {
          await AsyncStorage.removeItem(oldestKey);
        }
      }
      
      await this.saveCacheIndex();
    }
  }

  /**
   * Get a trail from cache by ID
   */
  async getTrailFromCache(id: number): Promise<Trail | null> {
    if (!this.initialized) await this.init();

    try {
      const key = `${TRAIL_CACHE_KEY}${id}`;
      const cacheJson = await AsyncStorage.getItem(key);
      
      if (cacheJson) {
        const cache: CacheItem<Trail> = JSON.parse(cacheJson);
        
        // Check if cache is expired
        if (Date.now() - cache.timestamp <= cache.expiry) {
          console.log(`Cache hit for trail ${id}`);
          return cache.data;
        } else {
          // Cache is expired, remove it
          await AsyncStorage.removeItem(key);
          const index = this.cacheIndex.indexOf(key);
          if (index !== -1) {
            this.cacheIndex.splice(index, 1);
            await this.saveCacheIndex();
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting trail ${id} from cache:`, error);
      return null;
    }
  }

  /**
   * Cache a trail
   */
  async cacheTrail(trail: Trail, expiry: number = DEFAULT_CACHE_EXPIRY): Promise<void> {
    if (!this.initialized) await this.init();

    try {
      const key = `${TRAIL_CACHE_KEY}${trail.id}`;
      const cacheItem: CacheItem<Trail> = {
        data: trail,
        timestamp: Date.now(),
        expiry,
      };
      
      await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
      await this.addToIndex(key);
      
      console.log(`Cached trail ${trail.id}`);
    } catch (error) {
      console.error(`Error caching trail ${trail.id}:`, error);
    }
  }

  /**
   * Get trails near a location from cache
   */
  async getTrailsNearFromCache(
    latitude: number,
    longitude: number,
    radiusInMiles: number = 10
  ): Promise<Trail[] | null> {
    if (!this.initialized) await this.init();

    try {
      // Round coordinates to reduce cache fragmentation
      const roundedLat = Math.round(latitude * 1000) / 1000;
      const roundedLon = Math.round(longitude * 1000) / 1000;
      
      const key = `${TRAILS_NEAR_CACHE_KEY}${roundedLat}_${roundedLon}_${radiusInMiles}`;
      const cacheJson = await AsyncStorage.getItem(key);
      
      if (cacheJson) {
        const cache: CacheItem<Trail[]> = JSON.parse(cacheJson);
        
        // Check if cache is expired
        if (Date.now() - cache.timestamp <= cache.expiry) {
          console.log(`Cache hit for trails near ${roundedLat},${roundedLon}`);
          return cache.data;
        } else {
          // Cache is expired, remove it
          await AsyncStorage.removeItem(key);
          const index = this.cacheIndex.indexOf(key);
          if (index !== -1) {
            this.cacheIndex.splice(index, 1);
            await this.saveCacheIndex();
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting trails near from cache:`, error);
      return null;
    }
  }

  /**
   * Cache trails near a location
   */
  async cacheTrailsNear(
    latitude: number,
    longitude: number,
    trails: Trail[],
    radiusInMiles: number = 10,
    expiry: number = DEFAULT_CACHE_EXPIRY
  ): Promise<void> {
    if (!this.initialized) await this.init();

    try {
      // Round coordinates to reduce cache fragmentation
      const roundedLat = Math.round(latitude * 1000) / 1000;
      const roundedLon = Math.round(longitude * 1000) / 1000;
      
      const key = `${TRAILS_NEAR_CACHE_KEY}${roundedLat}_${roundedLon}_${radiusInMiles}`;
      const cacheItem: CacheItem<Trail[]> = {
        data: trails,
        timestamp: Date.now(),
        expiry,
      };
      
      await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
      await this.addToIndex(key);
      
      console.log(`Cached ${trails.length} trails near ${roundedLat},${roundedLon}`);
    } catch (error) {
      console.error(`Error caching trails near:`, error);
    }
  }

  /**
   * Get parks near a location from cache
   */
  async getParksNearFromCache(
    latitude: number,
    longitude: number,
    radiusInMiles: number = 10
  ): Promise<Park[] | null> {
    if (!this.initialized) await this.init();

    try {
      // Round coordinates to reduce cache fragmentation
      const roundedLat = Math.round(latitude * 1000) / 1000;
      const roundedLon = Math.round(longitude * 1000) / 1000;
      
      const key = `${PARKS_NEAR_CACHE_KEY}${roundedLat}_${roundedLon}_${radiusInMiles}`;
      const cacheJson = await AsyncStorage.getItem(key);
      
      if (cacheJson) {
        const cache: CacheItem<Park[]> = JSON.parse(cacheJson);
        
        // Check if cache is expired
        if (Date.now() - cache.timestamp <= cache.expiry) {
          console.log(`Cache hit for parks near ${roundedLat},${roundedLon}`);
          return cache.data;
        } else {
          // Cache is expired, remove it
          await AsyncStorage.removeItem(key);
          const index = this.cacheIndex.indexOf(key);
          if (index !== -1) {
            this.cacheIndex.splice(index, 1);
            await this.saveCacheIndex();
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting parks near from cache:`, error);
      return null;
    }
  }

  /**
   * Cache parks near a location
   */
  async cacheParksNear(
    latitude: number,
    longitude: number,
    parks: Park[],
    radiusInMiles: number = 10,
    expiry: number = DEFAULT_CACHE_EXPIRY
  ): Promise<void> {
    if (!this.initialized) await this.init();

    try {
      // Round coordinates to reduce cache fragmentation
      const roundedLat = Math.round(latitude * 1000) / 1000;
      const roundedLon = Math.round(longitude * 1000) / 1000;
      
      const key = `${PARKS_NEAR_CACHE_KEY}${roundedLat}_${roundedLon}_${radiusInMiles}`;
      const cacheItem: CacheItem<Park[]> = {
        data: parks,
        timestamp: Date.now(),
        expiry,
      };
      
      await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
      await this.addToIndex(key);
      
      console.log(`Cached ${parks.length} parks near ${roundedLat},${roundedLon}`);
    } catch (error) {
      console.error(`Error caching parks near:`, error);
    }
  }

  /**
   * Get POIs for a trail from cache
   */
  async getPOIsFromCache(trailId: number, poiType?: string): Promise<POI[] | null> {
    if (!this.initialized) await this.init();

    try {
      const key = poiType 
        ? `${POIS_CACHE_KEY}${trailId}_${poiType}` 
        : `${POIS_CACHE_KEY}${trailId}`;
      
      const cacheJson = await AsyncStorage.getItem(key);
      
      if (cacheJson) {
        const cache: CacheItem<POI[]> = JSON.parse(cacheJson);
        
        // Check if cache is expired
        if (Date.now() - cache.timestamp <= cache.expiry) {
          console.log(`Cache hit for POIs of trail ${trailId}`);
          return cache.data;
        } else {
          // Cache is expired, remove it
          await AsyncStorage.removeItem(key);
          const index = this.cacheIndex.indexOf(key);
          if (index !== -1) {
            this.cacheIndex.splice(index, 1);
            await this.saveCacheIndex();
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting POIs for trail ${trailId} from cache:`, error);
      return null;
    }
  }

  /**
   * Cache POIs for a trail
   */
  async cachePOIs(
    trailId: number,
    pois: POI[],
    poiType?: string,
    expiry: number = DEFAULT_CACHE_EXPIRY
  ): Promise<void> {
    if (!this.initialized) await this.init();

    try {
      const key = poiType 
        ? `${POIS_CACHE_KEY}${trailId}_${poiType}` 
        : `${POIS_CACHE_KEY}${trailId}`;
      
      const cacheItem: CacheItem<POI[]> = {
        data: pois,
        timestamp: Date.now(),
        expiry,
      };
      
      await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
      await this.addToIndex(key);
      
      console.log(`Cached ${pois.length} POIs for trail ${trailId}`);
    } catch (error) {
      console.error(`Error caching POIs for trail ${trailId}:`, error);
    }
  }

  /**
   * Get filtered trails from cache
   */
  async getFilteredTrailsFromCache(filterKey: string): Promise<Trail[] | null> {
    if (!this.initialized) await this.init();

    try {
      const key = `${FILTERED_TRAILS_CACHE_KEY}${filterKey}`;
      const cacheJson = await AsyncStorage.getItem(key);
      
      if (cacheJson) {
        const cache: CacheItem<Trail[]> = JSON.parse(cacheJson);
        
        // Check if cache is expired
        if (Date.now() - cache.timestamp <= cache.expiry) {
          console.log(`Cache hit for filtered trails with key ${filterKey}`);
          return cache.data;
        } else {
          // Cache is expired, remove it
          await AsyncStorage.removeItem(key);
          const index = this.cacheIndex.indexOf(key);
          if (index !== -1) {
            this.cacheIndex.splice(index, 1);
            await this.saveCacheIndex();
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting filtered trails from cache:`, error);
      return null;
    }
  }

  /**
   * Cache filtered trails
   */
  async cacheFilteredTrails(
    filterKey: string,
    trails: Trail[],
    expiry: number = DEFAULT_CACHE_EXPIRY
  ): Promise<void> {
    if (!this.initialized) await this.init();

    try {
      const key = `${FILTERED_TRAILS_CACHE_KEY}${filterKey}`;
      const cacheItem: CacheItem<Trail[]> = {
        data: trails,
        timestamp: Date.now(),
        expiry,
      };
      
      await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
      await this.addToIndex(key);
      
      console.log(`Cached ${trails.length} filtered trails with key ${filterKey}`);
    } catch (error) {
      console.error(`Error caching filtered trails:`, error);
    }
  }

  /**
   * Clear the entire cache
   */
  async clearCache(): Promise<void> {
    try {
      // Remove all cache items
      for (const key of this.cacheIndex) {
        await AsyncStorage.removeItem(key);
      }
      
      // Clear cache index
      this.cacheIndex = [];
      await AsyncStorage.removeItem(`${CACHE_PREFIX}index`);
      
      console.log('Cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Prune expired cache items
   */
  async pruneCache(): Promise<void> {
    try {
      const now = Date.now();
      const keysToRemove: string[] = [];
      
      // Check each cache item
      for (const key of this.cacheIndex) {
        const cacheJson = await AsyncStorage.getItem(key);
        
        if (cacheJson) {
          const cache: CacheItem<any> = JSON.parse(cacheJson);
          
          // Check if cache is expired
          if (now - cache.timestamp > cache.expiry) {
            keysToRemove.push(key);
          }
        } else {
          // Item doesn't exist, add to removal list
          keysToRemove.push(key);
        }
      }
      
      // Remove expired items
      for (const key of keysToRemove) {
        await AsyncStorage.removeItem(key);
        const index = this.cacheIndex.indexOf(key);
        if (index !== -1) {
          this.cacheIndex.splice(index, 1);
        }
      }
      
      // Save updated index
      await this.saveCacheIndex();
      
      if (keysToRemove.length > 0) {
        console.log(`Pruned ${keysToRemove.length} expired cache items`);
      }
    } catch (error) {
      console.error('Error pruning cache:', error);
    }
  }

  /**
   * Generate a hash key for filter parameters
   */
  generateFilterKey(filters: any): string {
    return JSON.stringify(filters);
  }
}

// Export a singleton instance
export default new QueryCacheService();
