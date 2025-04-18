import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trail } from '../models/types';
import DatabaseService from '../database/DatabaseService';

const SAVED_TRAILS_KEY = 'saved_trails';

/**
 * Service for managing saved/favorite trails
 */
class SavedTrailsService {
  /**
   * Check if a trail is saved as a favorite
   * @param trailId The ID of the trail to check
   * @returns True if the trail is saved, false otherwise
   */
  async isTrailSaved(trailId: number): Promise<boolean> {
    try {
      const savedTrailIds = await this.getSavedTrailIds();
      return savedTrailIds.includes(trailId);
    } catch (error) {
      console.error('Error checking if trail is saved:', error);
      return false;
    }
  }

  /**
   * Save a trail as a favorite
   * @param trailId The ID of the trail to save
   */
  async saveTrail(trailId: number): Promise<void> {
    try {
      const savedTrailIds = await this.getSavedTrailIds();
      
      if (!savedTrailIds.includes(trailId)) {
        savedTrailIds.push(trailId);
        await this.saveSavedTrailIds(savedTrailIds);
      }
    } catch (error) {
      console.error('Error saving trail:', error);
      throw error;
    }
  }

  /**
   * Remove a trail from favorites
   * @param trailId The ID of the trail to remove
   */
  async removeTrail(trailId: number): Promise<void> {
    try {
      const savedTrailIds = await this.getSavedTrailIds();
      const updatedIds = savedTrailIds.filter(id => id !== trailId);
      await this.saveSavedTrailIds(updatedIds);
    } catch (error) {
      console.error('Error removing trail:', error);
      throw error;
    }
  }

  /**
   * Get all saved trail IDs
   * @returns Array of saved trail IDs
   */
  async getSavedTrailIds(): Promise<number[]> {
    try {
      const savedTrailsJson = await AsyncStorage.getItem(SAVED_TRAILS_KEY);
      
      if (savedTrailsJson) {
        return JSON.parse(savedTrailsJson);
      }
      
      return [];
    } catch (error) {
      console.error('Error getting saved trail IDs:', error);
      return [];
    }
  }

  /**
   * Save the list of trail IDs
   * @param trailIds Array of trail IDs to save
   */
  private async saveSavedTrailIds(trailIds: number[]): Promise<void> {
    try {
      await AsyncStorage.setItem(SAVED_TRAILS_KEY, JSON.stringify(trailIds));
    } catch (error) {
      console.error('Error saving trail IDs:', error);
      throw error;
    }
  }

  /**
   * Get all saved trails with full details
   * @returns Array of saved trails with full details
   */
  async getSavedTrails(): Promise<Trail[]> {
    try {
      const savedTrailIds = await this.getSavedTrailIds();
      const savedTrails: Trail[] = [];
      
      for (const trailId of savedTrailIds) {
        const trail = await DatabaseService.getTrailById(trailId);
        if (trail) {
          savedTrails.push(trail);
        }
      }
      
      return savedTrails;
    } catch (error) {
      console.error('Error getting saved trails:', error);
      return [];
    }
  }

  /**
   * Clear all saved trails
   */
  async clearSavedTrails(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SAVED_TRAILS_KEY);
    } catch (error) {
      console.error('Error clearing saved trails:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export default new SavedTrailsService();
