// src/services/MapCacheService.ts
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_FOLDER = `${FileSystem.cacheDirectory}map-tiles/`;
const CACHE_INDEX_KEY = 'map_tiles_cache_index';

interface TileInfo {
  key: string;
  url: string;
  path: string;
  size: number;
  timestamp: number;
}

interface CacheIndex {
  tiles: { [key: string]: TileInfo };
  size: number;
  lastPruned: number;
}

class MapCacheService {
  private cacheIndex: CacheIndex | null = null;
  private maxCacheSize: number = 50 * 1024 * 1024; // 50MB default
  private initialized: boolean = false;

  constructor() {
    this.init = this.init.bind(this);
    this.cacheTile = this.cacheTile.bind(this);
    this.getTile = this.getTile.bind(this);
    this.pruneCache = this.pruneCache.bind(this);
    this.cacheRegion = this.cacheRegion.bind(this);
  }

  /**
   * Initialize the cache service
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create cache directory if it doesn't exist
      const cacheDir = await FileSystem.getInfoAsync(CACHE_FOLDER);
      if (!cacheDir.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
      }

      // Load cache index
      const indexJson = await AsyncStorage.getItem(CACHE_INDEX_KEY);
      if (indexJson) {
        this.cacheIndex = JSON.parse(indexJson);
      } else {
        this.cacheIndex = { tiles: {}, size: 0, lastPruned: Date.now() };
        await this.saveIndex();
      }

      this.initialized = true;
      console.log('Map cache initialized');
    } catch (error) {
      console.error('Failed to initialize map cache:', error);
      throw error;
    }
  }

  /**
   * Save the cache index to AsyncStorage
   */
  private async saveIndex(): Promise<void> {
    if (!this.cacheIndex) return;
    await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(this.cacheIndex));
  }

  /**
   * Cache a single map tile
   * @param url URL of the tile to cache
   * @returns Path to the cached tile
   */
  async cacheTile(url: string): Promise<string> {
    if (!this.initialized) await this.init();
    if (!this.cacheIndex) throw new Error('Cache not initialized');

    // Generate a key for this tile
    const key = this.urlToKey(url);
    
    // Check if tile is already cached
    if (this.cacheIndex.tiles[key]) {
      // Update timestamp
      this.cacheIndex.tiles[key].timestamp = Date.now();
      await this.saveIndex();
      return this.cacheIndex.tiles[key].path;
    }

    // Download the tile
    const path = `${CACHE_FOLDER}${key}`;
    try {
      const download = await FileSystem.downloadAsync(url, path);
      
      // Add to cache index
      const tileInfo: TileInfo = {
        key,
        url,
        path,
        size: download.headers['content-length'] ? parseInt(download.headers['content-length']) : 0,
        timestamp: Date.now()
      };
      
      this.cacheIndex.tiles[key] = tileInfo;
      this.cacheIndex.size += tileInfo.size;
      
      // Prune cache if needed
      if (this.cacheIndex.size > this.maxCacheSize) {
        await this.pruneCache();
      }
      
      await this.saveIndex();
      return path;
    } catch (error) {
      console.error(`Failed to cache tile ${url}:`, error);
      throw error;
    }
  }

  /**
   * Get a cached tile if available
   * @param url URL of the tile
   * @returns Path to the cached tile or null if not cached
   */
  async getTile(url: string): Promise<string | null> {
    if (!this.initialized) await this.init();
    if (!this.cacheIndex) throw new Error('Cache not initialized');

    const key = this.urlToKey(url);
    const tileInfo = this.cacheIndex.tiles[key];
    
    if (!tileInfo) return null;
    
    // Check if file exists
    const fileInfo = await FileSystem.getInfoAsync(tileInfo.path);
    if (!fileInfo.exists) {
      // File doesn't exist, remove from index
      delete this.cacheIndex.tiles[key];
      this.cacheIndex.size -= tileInfo.size;
      await this.saveIndex();
      return null;
    }
    
    // Update timestamp
    tileInfo.timestamp = Date.now();
    await this.saveIndex();
    
    return tileInfo.path;
  }

  /**
   * Prune old tiles from cache
   */
  async pruneCache(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.initialized) await this.init();
    if (!this.cacheIndex) throw new Error('Cache not initialized');

    const now = Date.now();
    const tilesToRemove: string[] = [];
    
    // Find old tiles
    for (const key in this.cacheIndex.tiles) {
      const tile = this.cacheIndex.tiles[key];
      if (now - tile.timestamp > maxAge) {
        tilesToRemove.push(key);
      }
    }
    
    // If not enough old tiles, remove least recently used
    if (tilesToRemove.length === 0 && this.cacheIndex.size > this.maxCacheSize) {
      const tiles = Object.values(this.cacheIndex.tiles)
        .sort((a, b) => a.timestamp - b.timestamp);
      
      let sizeToFree = this.cacheIndex.size - (this.maxCacheSize * 0.8); // Free 20% of max
      let i = 0;
      
      while (sizeToFree > 0 && i < tiles.length) {
        tilesToRemove.push(tiles[i].key);
        sizeToFree -= tiles[i].size;
        i++;
      }
    }
    
    // Remove tiles
    for (const key of tilesToRemove) {
      const tile = this.cacheIndex.tiles[key];
      try {
        await FileSystem.deleteAsync(tile.path, { idempotent: true });
        this.cacheIndex.size -= tile.size;
        delete this.cacheIndex.tiles[key];
      } catch (error) {
        console.error(`Failed to delete cached tile ${key}:`, error);
      }
    }
    
    this.cacheIndex.lastPruned = now;
    await this.saveIndex();
    
    console.log(`Pruned ${tilesToRemove.length} tiles from cache`);
  }

  /**
   * Cache map tiles for a specific region
   * @param region Map region to cache
   * @param minZoom Minimum zoom level
   * @param maxZoom Maximum zoom level
   */
  async cacheRegion(
    region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number },
    minZoom: number = 12,
    maxZoom: number = 16
  ): Promise<void> {
    if (!this.initialized) await this.init();

    // Calculate tile coordinates for the region
    const tiles = this.getTilesForRegion(region, minZoom, maxZoom);
    console.log(`Caching ${tiles.length} tiles for region`);
    
    // Cache tiles in batches to avoid overwhelming the device
    const batchSize = 5;
    for (let i = 0; i < tiles.length; i += batchSize) {
      const batch = tiles.slice(i, i + batchSize);
      await Promise.all(batch.map(tile => this.cacheTile(tile.url)));
    }
  }

  /**
   * Get all tiles needed for a region
   * @param region Map region
   * @param minZoom Minimum zoom level
   * @param maxZoom Maximum zoom level
   * @returns Array of tile information
   */
  private getTilesForRegion(
    region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number },
    minZoom: number,
    maxZoom: number
  ): { url: string; x: number; y: number; z: number }[] {
    const result = [];
    
    // For each zoom level
    for (let z = minZoom; z <= maxZoom; z++) {
      // Calculate tile coordinates
      const minX = this.longitudeToTileX(region.longitude - region.longitudeDelta / 2, z);
      const maxX = this.longitudeToTileX(region.longitude + region.longitudeDelta / 2, z);
      const minY = this.latitudeToTileY(region.latitude + region.latitudeDelta / 2, z);
      const maxY = this.latitudeToTileY(region.latitude - region.latitudeDelta / 2, z);
      
      // Add all tiles in the region
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          result.push({
            url: this.getTileUrl(x, y, z),
            x,
            y,
            z
          });
        }
      }
    }
    
    return result;
  }

  /**
   * Convert longitude to tile X coordinate
   */
  private longitudeToTileX(longitude: number, zoom: number): number {
    return Math.floor((longitude + 180) / 360 * Math.pow(2, zoom));
  }

  /**
   * Convert latitude to tile Y coordinate
   */
  private latitudeToTileY(latitude: number, zoom: number): number {
    return Math.floor((1 - Math.log(Math.tan(latitude * Math.PI / 180) + 1 / Math.cos(latitude * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  }

  /**
   * Get the URL for a tile
   * Using OpenStreetMap tiles as an example
   */
  private getTileUrl(x: number, y: number, z: number): string {
    // Using OpenStreetMap tiles - in a production app, use a proper tile provider with API key
    return `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
  }

  /**
   * Convert a URL to a cache key
   */
  private urlToKey(url: string): string {
    return url
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .toLowerCase();
  }

  /**
   * Set the maximum cache size
   * @param sizeInBytes Maximum cache size in bytes
   */
  setMaxCacheSize(sizeInBytes: number): void {
    this.maxCacheSize = sizeInBytes;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ size: number; count: number; lastPruned: number }> {
    if (!this.initialized) await this.init();
    if (!this.cacheIndex) throw new Error('Cache not initialized');
    
    return {
      size: this.cacheIndex.size,
      count: Object.keys(this.cacheIndex.tiles).length,
      lastPruned: this.cacheIndex.lastPruned
    };
  }

  /**
   * Clear the entire cache
   */
  async clearCache(): Promise<void> {
    if (!this.initialized) await this.init();
    if (!this.cacheIndex) throw new Error('Cache not initialized');
    
    try {
      await FileSystem.deleteAsync(CACHE_FOLDER, { idempotent: true });
      await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
      
      this.cacheIndex = { tiles: {}, size: 0, lastPruned: Date.now() };
      await this.saveIndex();
      
      console.log('Cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export default new MapCacheService();