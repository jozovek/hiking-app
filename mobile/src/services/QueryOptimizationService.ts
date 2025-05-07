// src/services/QueryOptimizationService.ts
import * as SQLite from 'expo-sqlite';
import { Trail, Park, POI } from '../models/types';

/**
 * Service for optimized database queries
 * This service provides optimized versions of database queries,
 * particularly for location-based searches
 */
class QueryOptimizationService {
  private db: any = null;
  private initialized: boolean = false;

  constructor() {
    this.init = this.init.bind(this);
    this.getTrailsNearLocationOptimized = this.getTrailsNearLocationOptimized.bind(this);
    this.getParksNearLocationOptimized = this.getParksNearLocationOptimized.bind(this);
  }

  /**
   * Initialize the service
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Open the database
      this.db = SQLite.openDatabaseSync('trails.db');
      this.initialized = true;
      console.log('Query optimization service initialized successfully');
    } catch (error) {
      console.error('Error initializing query optimization service:', error);
      throw error;
    }
  }

  /**
   * Get trails near a specific location using Haversine formula for more accurate distance calculation
   * @param latitude User's latitude
   * @param longitude User's longitude
   * @param radiusInMiles Search radius in miles
   * @param limit Maximum number of results to return
   * @returns Array of trails sorted by distance
   */
  async getTrailsNearLocationOptimized(
    latitude: number,
    longitude: number,
    radiusInMiles: number = 10,
    limit: number = 50
  ): Promise<Trail[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      this.db?.transaction(tx => {
        // Use Haversine formula for accurate distance calculation
        // 3959 is Earth's radius in miles
        tx.executeSql(
          `SELECT *, 
            (3959 * acos(cos(radians(?)) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians(?)) + 
            sin(radians(?)) * sin(radians(latitude)))) AS distance 
          FROM trails 
          WHERE (3959 * acos(cos(radians(?)) * cos(radians(latitude)) * 
                cos(radians(longitude) - radians(?)) + 
                sin(radians(?)) * sin(radians(latitude)))) < ? 
          ORDER BY distance ASC
          LIMIT ?`,
          [
            latitude, longitude, latitude,
            latitude, longitude, latitude,
            radiusInMiles, limit
          ],
          (_, { rows }) => {
            resolve(rows._array as Trail[]);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Get parks near a specific location using Haversine formula for more accurate distance calculation
   * @param latitude User's latitude
   * @param longitude User's longitude
   * @param radiusInMiles Search radius in miles
   * @param limit Maximum number of results to return
   * @returns Array of parks sorted by distance
   */
  async getParksNearLocationOptimized(
    latitude: number,
    longitude: number,
    radiusInMiles: number = 10,
    limit: number = 50
  ): Promise<Park[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      this.db?.transaction(tx => {
        // Use Haversine formula for accurate distance calculation
        tx.executeSql(
          `SELECT *, 
            (3959 * acos(cos(radians(?)) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians(?)) + 
            sin(radians(?)) * sin(radians(latitude)))) AS distance 
          FROM parks 
          WHERE (3959 * acos(cos(radians(?)) * cos(radians(latitude)) * 
                cos(radians(longitude) - radians(?)) + 
                sin(radians(?)) * sin(radians(latitude)))) < ? 
          ORDER BY distance ASC
          LIMIT ?`,
          [
            latitude, longitude, latitude,
            latitude, longitude, latitude,
            radiusInMiles, limit
          ],
          (_, { rows }) => {
            resolve(rows._array as Park[]);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Get trails filtered by multiple criteria with optimized query
   * @param filters Object containing filter criteria
   * @returns Array of trails matching the criteria
   */
  async getFilteredTrailsOptimized(filters: {
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
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      // Build the query dynamically based on filters
      let query = 'SELECT * FROM trails WHERE 1=1';
      const params: any[] = [];

      // Add difficulty filter
      if (filters.difficulty && filters.difficulty.length > 0) {
        query += ' AND difficulty IN (' + filters.difficulty.map(() => '?').join(',') + ')';
        params.push(...filters.difficulty);
      }

      // Add length filter
      if (filters.minLength !== undefined) {
        query += ' AND length >= ?';
        params.push(filters.minLength);
      }
      if (filters.maxLength !== undefined) {
        query += ' AND length <= ?';
        params.push(filters.maxLength);
      }

      // Add elevation filter
      if (filters.minElevation !== undefined) {
        query += ' AND elevation_gain >= ?';
        params.push(filters.minElevation);
      }
      if (filters.maxElevation !== undefined) {
        query += ' AND elevation_gain <= ?';
        params.push(filters.maxElevation);
      }

      // Add surface type filter
      if (filters.surfaceTypes && filters.surfaceTypes.length > 0) {
        query += ' AND surface_type IN (' + filters.surfaceTypes.map(() => '?').join(',') + ')';
        params.push(...filters.surfaceTypes);
      }

      // Add route type filter
      if (filters.routeTypes && filters.routeTypes.length > 0) {
        query += ' AND route_type IN (' + filters.routeTypes.map(() => '?').join(',') + ')';
        params.push(...filters.routeTypes);
      }

      // Add accessibility filter
      if (filters.isAccessible !== undefined) {
        query += ' AND is_accessible = ?';
        params.push(filters.isAccessible ? 1 : 0);
      }

      // Add park filter
      if (filters.parkId !== undefined) {
        query += ' AND park_id = ?';
        params.push(filters.parkId);
      }

      // Add text search
      if (filters.searchText) {
        query += ' AND (name LIKE ? OR description LIKE ?)';
        const searchParam = `%${filters.searchText}%`;
        params.push(searchParam, searchParam);
      }

      // Add order by
      query += ' ORDER BY name ASC';

      // Add limit and offset
      if (filters.limit !== undefined) {
        query += ' LIMIT ?';
        params.push(filters.limit);

        if (filters.offset !== undefined) {
          query += ' OFFSET ?';
          params.push(filters.offset);
        }
      }

      this.db?.transaction(tx => {
        tx.executeSql(
          query,
          params,
          (_, { rows }) => {
            resolve(rows._array as Trail[]);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  /**
   * Get POIs for a trail with optimized query
   * @param trailId Trail ID
   * @param poiType Optional POI type filter
   * @returns Array of POIs for the trail
   */
  async getPOIsForTrailOptimized(
    trailId: number,
    poiType?: string
  ): Promise<POI[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM pois WHERE trail_id = ?';
      const params: any[] = [trailId];

      if (poiType) {
        query += ' AND type = ?';
        params.push(poiType);
      }

      query += ' ORDER BY name ASC';

      this.db?.transaction(tx => {
        tx.executeSql(
          query,
          params,
          (_, { rows }) => {
            resolve(rows._array as POI[]);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }
}

// Export a singleton instance
export default new QueryOptimizationService();
