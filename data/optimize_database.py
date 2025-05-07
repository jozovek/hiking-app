#!/usr/bin/env python3
"""
Philadelphia Hiking Trails App - Database Optimization Script

This script optimizes the SQLite database for the Philadelphia Hiking Trails app
by adding indexes for frequently queried fields and optimizing the schema for
better performance.

Usage:
    python optimize_database.py [--db-path DB_PATH]

Options:
    --db-path DB_PATH   Path to the database file (default: mobile/assets/database/trails.db)
"""

import os
import sqlite3
import logging
import argparse
from pathlib import Path
from datetime import datetime

# Set up logging
log_dir = Path("data/logs")
log_dir.mkdir(exist_ok=True)
log_file = log_dir / f"db_optimization_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

def add_indexes(conn):
    """
    Add indexes to the database for frequently queried fields.
    
    Args:
        conn (sqlite3.Connection): SQLite connection
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        cursor = conn.cursor()
        
        # Check if the trails table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='trails'")
        if not cursor.fetchone():
            logging.error("Trails table does not exist")
            return False
        
        # Get existing indexes
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index'")
        existing_indexes = [row[0] for row in cursor.fetchall()]
        
        # Add index for difficulty
        if 'idx_trails_difficulty' not in existing_indexes:
            logging.info("Adding index for difficulty")
            cursor.execute('CREATE INDEX idx_trails_difficulty ON trails(difficulty)')
        
        # Add index for length
        if 'idx_trails_length' not in existing_indexes:
            logging.info("Adding index for length")
            cursor.execute('CREATE INDEX idx_trails_length ON trails(length)')
        
        # Add index for elevation_gain
        if 'idx_trails_elevation_gain' not in existing_indexes:
            logging.info("Adding index for elevation_gain")
            cursor.execute('CREATE INDEX idx_trails_elevation_gain ON trails(elevation_gain)')
        
        # Add index for surface_type
        if 'idx_trails_surface_type' not in existing_indexes:
            logging.info("Adding index for surface_type")
            cursor.execute('CREATE INDEX idx_trails_surface_type ON trails(surface_type)')
        
        # Add index for route_type
        if 'idx_trails_route_type' not in existing_indexes:
            logging.info("Adding index for route_type")
            cursor.execute('CREATE INDEX idx_trails_route_type ON trails(route_type)')
        
        # Add index for is_accessible
        if 'idx_trails_is_accessible' not in existing_indexes:
            logging.info("Adding index for is_accessible")
            cursor.execute('CREATE INDEX idx_trails_is_accessible ON trails(is_accessible)')
        
        # Add index for latitude and longitude (for location-based queries)
        if 'idx_trails_location' not in existing_indexes:
            logging.info("Adding index for latitude and longitude")
            cursor.execute('CREATE INDEX idx_trails_location ON trails(latitude, longitude)')
        
        # Add index for park_id
        if 'idx_trails_park_id' not in existing_indexes:
            logging.info("Adding index for park_id")
            cursor.execute('CREATE INDEX idx_trails_park_id ON trails(park_id)')
        
        # Add index for POIs trail_id
        if 'idx_pois_trail_id' not in existing_indexes:
            logging.info("Adding index for POIs trail_id")
            cursor.execute('CREATE INDEX idx_pois_trail_id ON pois(trail_id)')
        
        # Add index for POIs type
        if 'idx_pois_type' not in existing_indexes:
            logging.info("Adding index for POIs type")
            cursor.execute('CREATE INDEX idx_pois_type ON pois(type)')
        
        # Add index for parks location
        if 'idx_parks_location' not in existing_indexes:
            logging.info("Adding index for parks location")
            cursor.execute('CREATE INDEX idx_parks_location ON parks(latitude, longitude)')
        
        conn.commit()
        logging.info("Indexes added successfully")
        return True
    
    except Exception as e:
        logging.error(f"Error adding indexes: {str(e)}")
        conn.rollback()
        return False

def optimize_database(db_path):
    """
    Optimize the database by adding indexes and running ANALYZE.
    
    Args:
        db_path (str): Path to the database file
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Check if database exists
        if not os.path.exists(db_path):
            logging.error(f"Database file not found: {db_path}")
            return False
        
        # Connect to database
        conn = sqlite3.connect(db_path)
        
        # Add indexes
        if not add_indexes(conn):
            conn.close()
            return False
        
        # Run ANALYZE to update statistics
        logging.info("Running ANALYZE to update statistics")
        conn.execute("ANALYZE")
        
        # Run VACUUM to optimize storage
        logging.info("Running VACUUM to optimize storage")
        conn.execute("VACUUM")
        
        # Close connection
        conn.close()
        
        logging.info(f"Database optimization completed successfully for {db_path}")
        return True
    
    except Exception as e:
        logging.error(f"Error optimizing database: {str(e)}")
        return False

def parse_arguments():
    """
    Parse command line arguments.
    
    Returns:
        argparse.Namespace: Parsed arguments
    """
    parser = argparse.ArgumentParser(description="Optimize SQLite database for Philadelphia Hiking Trails app")
    parser.add_argument("--db-path", default="mobile/assets/database/trails.db", help="Path to the database file")
    
    return parser.parse_args()

def main():
    """Main function to optimize the database."""
    args = parse_arguments()
    
    logging.info("Starting database optimization")
    
    if optimize_database(args.db_path):
        logging.info("Database optimization completed successfully")
        return 0
    else:
        logging.error("Database optimization completed with errors")
        return 1

if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)
