#!/usr/bin/env python3
"""
Philadelphia Hiking Trails App - Database Creation Script

This script creates the SQLite database for the Philadelphia Hiking Trails app.
It imports the processed trail data from the reconstruction step and organizes
it according to the database schema.

Usage:
    python create_database.py [--county COUNTY] [--force]

Options:
    --county COUNTY   Only import data for the specified county
    --force           Force recreation of the database even if it already exists
"""

import os
import sqlite3
import json
import logging
import argparse
import pandas as pd
from pathlib import Path
from datetime import datetime

# Set up logging
log_dir = Path("data/logs")
log_dir.mkdir(exist_ok=True)
log_file = log_dir / f"database_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

# Constants
COUNTIES = ["Philadelphia", "Bucks", "Chester", "Delaware", "Montgomery"]
PROCESSED_DATA_DIR = Path("data/processed")
ASSETS_DIR = Path("assets")
ASSETS_DIR.mkdir(exist_ok=True)
DB_PATH = ASSETS_DIR / "trails.db"


def create_database_schema(conn):
    """
    Create the database schema.
    
    Args:
        conn (sqlite3.Connection): SQLite connection
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        cursor = conn.cursor()
        
        # Create trails table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS trails (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            difficulty TEXT CHECK(difficulty IN ('Easy', 'Moderate', 'Hard')),
            length_miles REAL,
            county TEXT,
            start_lat REAL,
            start_lon REAL,
            status TEXT DEFAULT 'open'
        )
        ''')
        
        # Create trail_points table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS trail_points (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trail_id TEXT,
            sequence INTEGER,
            latitude REAL,
            longitude REAL,
            FOREIGN KEY (trail_id) REFERENCES trails(id)
        )
        ''')
        
        # Create app_metadata table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS app_metadata (
            key TEXT PRIMARY KEY,
            value TEXT
        )
        ''')
        
        # Create spatial index on trail_points
        cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_trail_points_trail_id ON trail_points(trail_id)
        ''')
        
        # Create spatial index on trails for start coordinates
        cursor.execute('''
        CREATE INDEX IF NOT EXISTS idx_trails_start_coords ON trails(start_lat, start_lon)
        ''')
        
        conn.commit()
        logging.info("Database schema created successfully")
        return True
    
    except Exception as e:
        logging.error(f"Error creating database schema: {str(e)}")
        conn.rollback()
        return False


def import_trails_data(conn, county):
    """
    Import trails data for a specific county.
    
    Args:
        conn (sqlite3.Connection): SQLite connection
        county (str): County name
        
    Returns:
        bool: True if successful, False otherwise
    """
    county_lower = county.lower()
    trails_file = PROCESSED_DATA_DIR / f"{county_lower}_trails.csv"
    
    if not trails_file.exists():
        logging.warning(f"Trails data file not found: {trails_file}")
        return False
    
    try:
        # Read trails data
        trails_df = pd.read_csv(trails_file)
        
        # Insert trails data
        cursor = conn.cursor()
        
        for _, trail in trails_df.iterrows():
            cursor.execute('''
            INSERT OR REPLACE INTO trails (
                id, name, difficulty, length_miles, county, start_lat, start_lon, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                trail['id'],
                trail['name'],
                trail['difficulty'],
                trail['length_miles'],
                trail['county'],
                trail['start_lat'],
                trail['start_lon'],
                trail.get('status', 'open')
            ))
        
        conn.commit()
        logging.info(f"Imported {len(trails_df)} trails for {county}")
        return True
    
    except Exception as e:
        logging.error(f"Error importing trails data for {county}: {str(e)}")
        conn.rollback()
        return False


def import_trail_points_data(conn, county):
    """
    Import trail points data for a specific county.
    
    Args:
        conn (sqlite3.Connection): SQLite connection
        county (str): County name
        
    Returns:
        bool: True if successful, False otherwise
    """
    county_lower = county.lower()
    points_file = PROCESSED_DATA_DIR / f"{county_lower}_trail_points.csv"
    
    if not points_file.exists():
        logging.warning(f"Trail points data file not found: {points_file}")
        return False
    
    try:
        # Read trail points data
        points_df = pd.read_csv(points_file)
        
        # Insert trail points data
        cursor = conn.cursor()
        
        for _, point in points_df.iterrows():
            cursor.execute('''
            INSERT INTO trail_points (
                trail_id, sequence, latitude, longitude
            ) VALUES (?, ?, ?, ?)
            ''', (
                point['trail_id'],
                point['sequence'],
                point['latitude'],
                point['longitude']
            ))
        
        conn.commit()
        logging.info(f"Imported {len(points_df)} trail points for {county}")
        return True
    
    except Exception as e:
        logging.error(f"Error importing trail points data for {county}: {str(e)}")
        conn.rollback()
        return False


def add_metadata(conn):
    """
    Add metadata to the database.
    
    Args:
        conn (sqlite3.Connection): SQLite connection
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        cursor = conn.cursor()
        
        # Add database version
        cursor.execute('''
        INSERT OR REPLACE INTO app_metadata (key, value)
        VALUES ('db_version', '1.0')
        ''')
        
        # Add last updated date
        current_date = datetime.now().strftime('%Y-%m-%d')
        cursor.execute('''
        INSERT OR REPLACE INTO app_metadata (key, value)
        VALUES ('last_updated', ?)
        ''', (current_date,))
        
        conn.commit()
        logging.info("Added metadata to database")
        return True
    
    except Exception as e:
        logging.error(f"Error adding metadata: {str(e)}")
        conn.rollback()
        return False


def validate_database(conn):
    """
    Validate the database.
    
    Args:
        conn (sqlite3.Connection): SQLite connection
        
    Returns:
        bool: True if validation passed, False otherwise
    """
    try:
        cursor = conn.cursor()
        
        # Check trails count
        cursor.execute("SELECT COUNT(*) FROM trails")
        trails_count = cursor.fetchone()[0]
        
        # Check trail_points count
        cursor.execute("SELECT COUNT(*) FROM trail_points")
        points_count = cursor.fetchone()[0]
        
        # Check metadata
        cursor.execute("SELECT * FROM app_metadata")
        metadata = cursor.fetchall()
        
        logging.info(f"Database validation: {trails_count} trails, {points_count} trail points")
        logging.info(f"Metadata: {metadata}")
        
        if trails_count == 0 or points_count == 0:
            logging.warning("Database validation failed: No trails or trail points found")
            return False
        
        return True
    
    except Exception as e:
        logging.error(f"Error validating database: {str(e)}")
        return False


def create_database(counties=None, force=False):
    """
    Create the database and import data.
    
    Args:
        counties (list): List of counties to import data for, or None for all counties
        force (bool): Force recreation of the database even if it already exists
        
    Returns:
        bool: True if successful, False otherwise
    """
    if counties is None:
        counties = COUNTIES
    
    # Check if database already exists
    if DB_PATH.exists() and not force:
        logging.info(f"Database already exists at {DB_PATH}")
        return True
    
    # Create or overwrite database
    try:
        # Create database directory if it doesn't exist
        DB_PATH.parent.mkdir(exist_ok=True)
        
        # Connect to database
        conn = sqlite3.connect(DB_PATH)
        
        # Create schema
        if not create_database_schema(conn):
            conn.close()
            return False
        
        # Import data for each county
        success = True
        for county in counties:
            logging.info(f"Importing data for {county} County")
            
            # Import trails data
            if not import_trails_data(conn, county):
                success = False
            
            # Import trail points data
            if not import_trail_points_data(conn, county):
                success = False
        
        # Add metadata
        if not add_metadata(conn):
            success = False
        
        # Validate database
        if not validate_database(conn):
            success = False
        
        # Close connection
        conn.close()
        
        if success:
            logging.info(f"Database created successfully at {DB_PATH}")
        else:
            logging.warning("Database creation completed with warnings")
        
        return success
    
    except Exception as e:
        logging.error(f"Error creating database: {str(e)}")
        return False


def parse_arguments():
    """
    Parse command line arguments.
    
    Returns:
        argparse.Namespace: Parsed arguments
    """
    parser = argparse.ArgumentParser(description="Create SQLite database for Philadelphia Hiking Trails app")
    parser.add_argument("--county", choices=COUNTIES, help="Only import data for the specified county")
    parser.add_argument("--force", action="store_true", help="Force recreation of the database even if it already exists")
    
    return parser.parse_args()


def main():
    """Main function to create the database."""
    args = parse_arguments()
    
    logging.info("Starting database creation")
    
    counties = [args.county] if args.county else None
    
    if create_database(counties, args.force):
        logging.info("Database creation completed successfully")
        return 0
    else:
        logging.error("Database creation completed with errors")
        return 1


if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)
