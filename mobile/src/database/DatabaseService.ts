import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { Trail, Park, POI } from '../models/types';

class DatabaseService {
  private db: any = null;
  private initialized: boolean = false;

  constructor() {
    this.init = this.init.bind(this);
    this.getTrails = this.getTrails.bind(this);
    this.getTrailById = this.getTrailById.bind(this);
    this.getTrailsNearLocation = this.getTrailsNearLocation.bind(this);
    this.getParksNearLocation = this.getParksNearLocation.bind(this);
    this.getPOIsForTrail = this.getPOIsForTrail.bind(this);
  }

  /**
   * Initialize the database by copying it from assets if needed
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Check if database exists in file system
      const dbExists = await FileSystem.getInfoAsync(
        `${FileSystem.documentDirectory}SQLite/trails.db`
      );

      if (!dbExists.exists) {
        // Create directory if it doesn't exist
        await FileSystem.makeDirectoryAsync(
          `${FileSystem.documentDirectory}SQLite`,
          { intermediates: true }
        );

        // Get the database from assets
        const asset = Asset.fromModule(require('../../assets/database/trails.db'));
        await asset.downloadAsync();

        // Copy database from assets to file system
        if (asset.localUri) {
          await FileSystem.copyAsync({
            from: asset.localUri,
            to: `${FileSystem.documentDirectory}SQLite/trails.db`,
          });
        }
      }

      // Open the database
      this.db = SQLite.openDatabaseSync('trails.db');
      this.initialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  /**
   * Get all trails from the database
   */
  async getTrails(): Promise<Trail[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      this.db?.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM trails ORDER BY name',
          [],
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
   * Get a trail by its ID
   */
  async getTrailById(id: number): Promise<Trail | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      this.db?.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM trails WHERE id = ?',
          [id],
          (_, { rows }) => {
            if (rows.length > 0) {
              resolve(rows.item(0) as Trail);
            } else {
              resolve(null);
            }
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
   * Get trails near a specific location within a radius
   */
  async getTrailsNearLocation(
    latitude: number,
    longitude: number,
    radiusInMiles: number = 10
  ): Promise<Trail[]> {
    if (!this.db) await this.init();

    // Convert miles to degrees (approximate)
    const radiusInDegrees = radiusInMiles / 69;

    return new Promise((resolve, reject) => {
      this.db?.transaction(tx => {
        tx.executeSql(
          `SELECT *, 
            (((latitude - ?) * (latitude - ?)) + 
            ((longitude - ?) * (longitude - ?))) AS distance 
          FROM trails 
          WHERE latitude BETWEEN ? AND ? 
            AND longitude BETWEEN ? AND ? 
          ORDER BY distance ASC`,
          [
            latitude, latitude,
            longitude, longitude,
            latitude - radiusInDegrees, latitude + radiusInDegrees,
            longitude - radiusInDegrees, longitude + radiusInDegrees,
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
   * Get parks near a specific location within a radius
   */
  async getParksNearLocation(
    latitude: number,
    longitude: number,
    radiusInMiles: number = 10
  ): Promise<Park[]> {
    if (!this.db) await this.init();

    // Convert miles to degrees (approximate)
    const radiusInDegrees = radiusInMiles / 69;

    return new Promise((resolve, reject) => {
      this.db?.transaction(tx => {
        tx.executeSql(
          `SELECT *, 
            (((latitude - ?) * (latitude - ?)) + 
            ((longitude - ?) * (longitude - ?))) AS distance 
          FROM parks 
          WHERE latitude BETWEEN ? AND ? 
            AND longitude BETWEEN ? AND ? 
          ORDER BY distance ASC`,
          [
            latitude, latitude,
            longitude, longitude,
            latitude - radiusInDegrees, latitude + radiusInDegrees,
            longitude - radiusInDegrees, longitude + radiusInDegrees,
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
   * Get points of interest for a specific trail
   */
  async getPOIsForTrail(trailId: number): Promise<POI[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      this.db?.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM pois WHERE trail_id = ? ORDER BY name',
          [trailId],
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

  /**
   * Get a park by its ID
   */
  async getParkById(parkId: number): Promise<Park | null> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      this.db?.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM parks WHERE id = ?',
          [parkId],
          (_, { rows }) => {
            if (rows.length > 0) {
              resolve(rows.item(0) as Park);
            } else {
              resolve(null);
            }
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
export default new DatabaseService();
