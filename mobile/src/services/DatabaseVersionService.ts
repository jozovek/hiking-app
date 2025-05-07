// src/services/DatabaseVersionService.ts
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';
import { useNetworkStatus } from '../providers/NetworkStatusProvider';

// Constants
const DB_VERSION_ENDPOINT = 'https://api.phillyhikingtrails.com/database/version';
const DB_DOWNLOAD_ENDPOINT = 'https://api.phillyhikingtrails.com/database/download';
const DB_VERSION_KEY = 'database_version';
const DB_LAST_CHECK_KEY = 'database_last_check';
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Service for managing database versions and updates
 */
class DatabaseVersionService {
  private initialized: boolean = false;
  private currentVersion: string = '1.0.0';
  private isUpdating: boolean = false;

  constructor() {
    this.init = this.init.bind(this);
    this.checkForUpdates = this.checkForUpdates.bind(this);
    this.downloadUpdate = this.downloadUpdate.bind(this);
    this.getCurrentVersion = this.getCurrentVersion.bind(this);
  }

  /**
   * Initialize the database version service
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Get the current database version from AsyncStorage
      const storedVersion = await AsyncStorage.getItem(DB_VERSION_KEY);
      if (storedVersion) {
        this.currentVersion = storedVersion;
      } else {
        // If no stored version, get it from the database
        const version = await this.getVersionFromDatabase();
        if (version) {
          this.currentVersion = version;
          await AsyncStorage.setItem(DB_VERSION_KEY, version);
        }
      }

      this.initialized = true;
      console.log(`Database version service initialized with version ${this.currentVersion}`);

      // Check for updates if online
      const { isConnected, isInternetReachable } = useNetworkStatus();
      if (isConnected && isInternetReachable) {
        this.checkForUpdates();
      }
    } catch (error) {
      console.error('Error initializing database version service:', error);
      // Don't throw error, just continue with the current version
    }
  }

  /**
   * Get the database version from the database
   */
  private async getVersionFromDatabase(): Promise<string | null> {
    try {
      // For simplicity, we'll just return the default version
      // In a real implementation, you would query the database
      return '1.0.0';
    } catch (error) {
      console.error('Error getting database version:', error);
      return null;
    }
  }

  /**
   * Check for database updates
   */
  async checkForUpdates(): Promise<void> {
    if (this.isUpdating) return;

    try {
      // Check if we've checked recently
      const lastCheck = await AsyncStorage.getItem(DB_LAST_CHECK_KEY);
      if (lastCheck) {
        const lastCheckTime = parseInt(lastCheck, 10);
        if (Date.now() - lastCheckTime < CHECK_INTERVAL) {
          console.log('Skipping database update check (checked recently)');
          return;
        }
      }

      // Check network status
      const { isConnected, isInternetReachable } = useNetworkStatus();
      if (!isConnected || !isInternetReachable) {
        console.log('Skipping database update check (offline)');
        return;
      }

      console.log('Checking for database updates...');
      this.isUpdating = true;

      // Update last check time
      await AsyncStorage.setItem(DB_LAST_CHECK_KEY, Date.now().toString());

      // Fetch the latest version from the server
      const response = await fetch(DB_VERSION_ENDPOINT);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const latestVersion = data.version;

      console.log(`Current version: ${this.currentVersion}, Latest version: ${latestVersion}`);

      // Compare versions
      if (this.compareVersions(latestVersion, this.currentVersion) > 0) {
        // Show update prompt
        Alert.alert(
          'Database Update Available',
          `A new version of the trail database is available (${latestVersion}). Would you like to download it now?`,
          [
            {
              text: 'Later',
              style: 'cancel',
              onPress: () => {
                this.isUpdating = false;
              },
            },
            {
              text: 'Download',
              onPress: () => this.downloadUpdate(latestVersion),
            },
          ]
        );
      } else {
        console.log('Database is up to date');
        this.isUpdating = false;
      }
    } catch (error) {
      console.error('Error checking for database updates:', error);
      this.isUpdating = false;
    }
  }

  /**
   * Download and install a database update
   */
  private async downloadUpdate(newVersion: string): Promise<void> {
    try {
      console.log(`Downloading database update to version ${newVersion}...`);

      // Create a temporary directory for the download
      const tempDir = `${FileSystem.cacheDirectory}db-updates/`;
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });

      // Download the new database
      const downloadPath = `${tempDir}trails-${newVersion}.db`;
      const downloadUrl = `${DB_DOWNLOAD_ENDPOINT}?version=${newVersion}`;

      const downloadResult = await FileSystem.downloadAsync(
        downloadUrl,
        downloadPath
      );

      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      console.log('Database download complete, installing...');

      // Replace the old database with the new one
      const dbDir = `${FileSystem.documentDirectory}SQLite/`;
      await FileSystem.makeDirectoryAsync(dbDir, { intermediates: true });
      
      await FileSystem.copyAsync({
        from: downloadPath,
        to: `${dbDir}trails.db`,
      });

      // Update the stored version
      this.currentVersion = newVersion;
      await AsyncStorage.setItem(DB_VERSION_KEY, newVersion);

      // Clean up
      await FileSystem.deleteAsync(tempDir, { idempotent: true });

      console.log(`Database updated to version ${newVersion}`);
      
      Alert.alert(
        'Update Complete',
        'The trail database has been updated to the latest version.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error downloading database update:', error);
      
      Alert.alert(
        'Update Failed',
        'There was a problem updating the trail database. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Compare two version strings
   * @returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
   */
  private compareVersions(v1: string, v2: string): number {
    const v1Parts = v1.split('.').map(Number);
    const v2Parts = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  /**
   * Get the current database version
   */
  getCurrentVersion(): string {
    return this.currentVersion;
  }
}

// Export a singleton instance
export default new DatabaseVersionService();
