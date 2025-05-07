// src/database/EnhancedDatabaseService.ts
import DatabaseService from './DatabaseService';
import QueryOptimizationService from '../services/QueryOptimizationService';
import QueryCacheService from '../services/QueryCacheService';
import { Trail, Park, POI } from '../models/types';
import { useNetworkStatus } from '../providers/NetworkStatusProvider';

/**
 * Enhanced database service that uses query optimization and caching
 * This service wraps the original DatabaseService and adds optimization and caching
 */
class EnhancedDatabaseService {
  private initialized: boolean = false;

  constructor() {
    this.init = this.init.bind(this);
    this.getTrails = this.getTrails.bind(this);
    this.getTrailById = this.getTrailById.bind(this);
    this.getTrailsNearLocation = this.getTrailsNearLocation.bind(this);
    this.getParksNearLocation = this.getParksNearLocation.bind(this);
    this.getPOIsForTrail = this.getPOIsForTrail.bind(this);
    this.getFilteredTrails = this.getFilteredTrails.bind(this);
  }

  /**
   * Initialize the enhanced database service
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize the original database service
      await DatabaseService.init();
      
      // Initialize the query optimization service
      await QueryOptimizationService.init();
      
      // Initialize the query cache service
      await QueryCacheService.init();
      
      this.initialized = true;
      console.log('Enhanced database service initialized successfully');
    } catch (error) {
      console.error('Error initializing enhanced database service:', error);
      throw error;
    }
  }

  /**
   * Get all trails with caching
   */
  async getTrails(): Promise<Trail[]> {
    if (!this.initialized) await this.init();

    try {
      // Try to get from cache first
      const cachedTrails = await QueryCacheService.getFilteredTrailsFromCache('all_trails');
      
      if (cachedTrails) {
        return cachedTrails;
      }
      
      // If not in cache, get from database
      const trails = await DatabaseService.getTrails();
      
      // Cache the results
      await QueryCacheService.cacheFilteredTrails('all_trails', trails);
      
      return trails;
    } catch (error) {
      console.error('Error getting trails:', error);
      // Fall back to original service if there's an error
      return DatabaseService.getTrails();
    }
  }

  /**
   * Get a trail by ID with caching
   */
  async getTrailById(id: number): Promise<Trail | null> {
    if (!this.initialized) await this.init();

    try {
      // Try to get from cache first
      const cachedTrail = await QueryCacheService.getTrailFromCache(id);
      
      if (cachedTrail) {
        return cachedTrail;
      }
      
      // If not in cache, get from database
      const trail = await DatabaseService.getTrailById(id);
      
      // Cache the result if it exists
      if (trail) {
        await QueryCacheService.cacheTrail(trail);
      }
      
      return trail;
    } catch (error) {
      console.error(`Error getting trail ${id}:`, error);
      // Fall back to original service if there's an error
      return DatabaseService.getTrailById(id);
    }
  }

  /**
   * Get trails near a location with optimization and caching
   */
  async getTrailsNearLocation(
    latitude: number,
    longitude: number,
    radiusInMiles: number = 10
  ): Promise<Trail[]> {
    if (!this.initialized) await this.init();

    try {
      // Try to get from cache first
      const cachedTrails = await QueryCacheService.getTrailsNearFromCache(
        latitude,
        longitude,
        radiusInMiles
      );
      
      if (cachedTrails) {
        return cachedTrails;
      }
      
      // If not in cache, use optimized query
      const trails = await QueryOptimizationService.getTrailsNearLocationOptimized(
        latitude,
        longitude,
        radiusInMiles
      );
      
      // Cache the results
      await QueryCacheService.cacheTrailsNear(
        latitude,
        longitude,
        trails,
        radiusInMiles
      );
      
      return trails;
    } catch (error) {
      console.error('Error getting trails near location:', error);
      // Fall back to original service if there's an error
      return DatabaseService.getTrailsNearLocation(latitude, longitude, radiusInMiles);
    }
  }

  /**
   * Get parks near a location with optimization and caching
   */
  async getParksNearLocation(
    latitude: number,
    longitude: number,
    radiusInMiles: number = 10
  ): Promise<Park[]> {
    if (!this.initialized) await this.init();

    try {
      // Try to get from cache first
      const cachedParks = await QueryCacheService.getParksNearFromCache(
        latitude,
        longitude,
        radiusInMiles
      );
      
      if (cachedParks) {
        return cachedParks;
      }
      
      // If not in cache, use optimized query
      const parks = await QueryOptimizationService.getParksNearLocationOptimized(
        latitude,
        longitude,
        radiusInMiles
      );
      
      // Cache the results
      await QueryCacheService.cacheParksNear(
        latitude,
        longitude,
        parks,
        radiusInMiles
      );
      
      return parks;
    } catch (error) {
      console.error('Error getting parks near location:', error);
      // Fall back to original service if there's an error
      return DatabaseService.getParksNearLocation(latitude, longitude, radiusInMiles);
    }
  }

  /**
   * Get POIs for a trail with optimization and caching
   */
  async getPOIsForTrail(trailId: number, poiType?: string): Promise<POI[]> {
    if (!this.initialized) await this.init();

    try {
      // Try to get from cache first
      const cachedPOIs = await QueryCacheService.getPOIsFromCache(trailId, poiType);
      
      if (cachedPOIs) {
        return cachedPOIs;
      }
      
      // If not in cache, use optimized query
      const pois = await QueryOptimizationService.getPOIsForTrailOptimized(trailId, poiType);
      
      // Cache the results
      await QueryCacheService.cachePOIs(trailId, pois, poiType);
      
      return pois;
    } catch (error) {
      console.error(`Error getting POIs for trail ${trailId}:`, error);
      // Fall back to original service if there's an error
      return DatabaseService.getPOIsForTrail(trailId);
    }
  }

  /**
   * Get filtered trails with optimization and caching
   */
  async getFilteredTrails(filters: {
    difficulty?: string[];
    minLength?: number;
    maxLength?: number;
    minElevation?: number;
    maxElevation?: number;
    surfaceTypes?: string[];
    routeTypes?: string[];
    isAccessible?: boolean;
    parkId?: number;
    searchText?: string;
    limit?: number;
    offset?: number;
  }): Promise<Trail[]> {
    if (!this.initialized) await this.init();

    try {
      // Generate a cache key for the filters
      const filterKey = QueryCacheService.generateFilterKey(filters);
      
      // Try to get from cache first
      const cachedTrails = await QueryCacheService.getFilteredTrailsFromCache(filterKey);
      
      if (cachedTrails) {
        return cachedTrails;
      }
      
      // If not in cache, use optimized query
      const trails = await QueryOptimizationService.getFilteredTrailsOptimized(filters);
      
      // Cache the results
      await QueryCacheService.cacheFilteredTrails(filterKey, trails);
      
      return trails;
    } catch (error) {
      console.error('Error getting filtered trails:', error);
      // Fall back to original service if there's an error with a basic query
      return DatabaseService.getTrails();
    }
  }

  /**
   * Clear the query cache
   */
  async clearCache(): Promise<void> {
    try {
      await QueryCacheService.clearCache();
      console.log('Query cache cleared');
    } catch (error) {
      console.error('Error clearing query cache:', error);
    }
  }
}

// Export a singleton instance
export default new EnhancedDatabaseService();
