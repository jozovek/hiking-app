#!/usr/bin/env python3
"""
Philadelphia Hiking Trails App - Data Collection Script

This script collects hiking trail data from OpenStreetMap using the Overpass API
for Philadelphia and surrounding counties (Bucks, Chester, Delaware, and Montgomery).
The raw data is saved as JSON files for further processing.

Usage:
    python collect_trails.py [--county COUNTY] [--force]

Options:
    --county COUNTY   Only collect data for the specified county
    --force           Force recollection even if data already exists
"""

import os
import json
import time
import logging
import argparse
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

import requests
import overpass

# Load environment variables
load_dotenv()

# Set up logging
log_dir = Path("data/logs")
log_dir.mkdir(exist_ok=True)
log_file = log_dir / f"collection_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

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
STATE = "Pennsylvania"
RAW_DATA_DIR = Path("data/raw")
CACHE_DIR = RAW_DATA_DIR / "cache"
CACHE_DIR.mkdir(exist_ok=True)

# Initialize Overpass API with endpoint from .env or default
OVERPASS_API_URL = os.getenv("OVERPASS_API_URL", "https://overpass-api.de/api/interpreter")
api = overpass.API(endpoint=OVERPASS_API_URL)

# Request timeout in seconds
TIMEOUT = 120

# Minimum time between API requests in seconds (to be respectful)
REQUEST_DELAY = 5


def build_trail_query(county):
    """
    Build Overpass query for hiking trails in a specific county.
    
    Args:
        county (str): County name
        
    Returns:
        str: Overpass QL query
    """
    return f"""
    // Get the county boundary
    area["name"="{county}"]["boundary"="administrative"]["admin_level"~"[4-8]"]->.county;
    
    // Get all hiking trails and paths within the county
    (
      way["highway"="path"](area.county);
      way["highway"="footway"](area.county);
      way["highway"="track"](area.county);
      way["route"="hiking"](area.county);
      relation["route"="hiking"](area.county);
    );
    out body;
    >;
    out skel qt;
    """


def build_park_query(county):
    """
    Build Overpass query for parks and protected areas in a specific county.
    
    Args:
        county (str): County name
        
    Returns:
        str: Overpass QL query
    """
    return f"""
    // Get the county boundary
    area["name"="{county}"]["boundary"="administrative"]["admin_level"~"[4-8]"]->.county;
    
    // Get all parks and protected areas within the county
    (
      way["leisure"="park"](area.county);
      relation["leisure"="park"](area.county);
      way["boundary"="protected_area"](area.county);
      relation["boundary"="protected_area"](area.county);
      way["leisure"="nature_reserve"](area.county);
      relation["leisure"="nature_reserve"](area.county);
    );
    out body;
    >;
    out skel qt;
    """


def build_poi_query(county):
    """
    Build Overpass query for points of interest related to hiking in a specific county.
    
    Args:
        county (str): County name
        
    Returns:
        str: Overpass QL query
    """
    return f"""
    // Get the county boundary
    area["name"="{county}"]["boundary"="administrative"]["admin_level"~"[4-8]"]->.county;
    
    // Get all hiking-related points of interest within the county
    (
      node["tourism"="viewpoint"](area.county);
      node["natural"="peak"](area.county);
      node["amenity"="drinking_water"](area.county);
      node["amenity"="parking"](area.county);
      node["amenity"="toilets"](area.county);
      node["information"="guidepost"](area.county);
      node["tourism"="information"](area.county);
      node["leisure"="picnic_table"](area.county);
    );
    out body;
    """


def should_collect(county, data_type, force=False):
    """
    Check if data should be collected or already exists.
    
    Args:
        county (str): County name
        data_type (str): Type of data (trails, parks, poi)
        force (bool): Force recollection even if data exists
        
    Returns:
        bool: True if data should be collected, False otherwise
    """
    file_path = RAW_DATA_DIR / f"{county.lower()}_{data_type}_raw.json"
    return force or not file_path.exists()


def collect_data(county, query, data_type, force=False):
    """
    Collect data using Overpass API and save to file.
    
    Args:
        county (str): County name
        query (str): Overpass QL query
        data_type (str): Type of data (trails, parks, poi)
        force (bool): Force recollection even if data exists
        
    Returns:
        dict: Collected data or None if collection failed
    """
    county_lower = county.lower()
    output_path = RAW_DATA_DIR / f"{county_lower}_{data_type}_raw.json"
    
    # Check if data should be collected
    if not should_collect(county, data_type, force):
        logging.info(f"Data for {county} {data_type} already exists, skipping collection")
        try:
            with open(output_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logging.error(f"Error loading existing data for {county} {data_type}: {str(e)}")
            # Continue with collection if loading fails
    
    logging.info(f"Collecting {data_type} data for {county} County")
    
    try:
        # Execute the query
        start_time = time.time()
        result = api.get(query, responseformat="json")
        
        # Save raw data
        with open(output_path, 'w') as f:
            json.dump(result, f, indent=2)
        
        # Save a cache copy
        cache_path = CACHE_DIR / f"{county_lower}_{data_type}_raw.json"
        with open(cache_path, 'w') as f:
            json.dump(result, f, indent=2)
        
        element_count = len(result.get('elements', []))
        logging.info(f"Collected {element_count} elements for {county} {data_type}")
        
        # Respect rate limits
        elapsed = time.time() - start_time
        if elapsed < REQUEST_DELAY:
            time.sleep(REQUEST_DELAY - elapsed)
            
        return result
    except Exception as e:
        logging.error(f"Error collecting {data_type} data for {county}: {str(e)}")
        
        # Try to use cached data if available
        cache_path = CACHE_DIR / f"{county_lower}_{data_type}_raw.json"
        if cache_path.exists():
            logging.info(f"Using cached data for {county} {data_type}")
            try:
                with open(cache_path, 'r') as f:
                    return json.load(f)
            except Exception as cache_e:
                logging.error(f"Error loading cached data: {str(cache_e)}")
        
        return None


def collect_trails_for_county(county, force=False):
    """
    Collect hiking trails for a specific county.
    
    Args:
        county (str): County name
        force (bool): Force recollection even if data exists
        
    Returns:
        dict: Collected trail data or None if collection failed
    """
    query = build_trail_query(county)
    return collect_data(county, query, "trails", force)


def collect_parks_for_county(county, force=False):
    """
    Collect park boundaries for a specific county.
    
    Args:
        county (str): County name
        force (bool): Force recollection even if data exists
        
    Returns:
        dict: Collected park data or None if collection failed
    """
    query = build_park_query(county)
    return collect_data(county, query, "parks", force)


def collect_poi_for_county(county, force=False):
    """
    Collect points of interest for a specific county.
    
    Args:
        county (str): County name
        force (bool): Force recollection even if data exists
        
    Returns:
        dict: Collected POI data or None if collection failed
    """
    query = build_poi_query(county)
    return collect_data(county, query, "poi", force)


def validate_collected_data(counties=None):
    """
    Validate the collected data for completeness.
    
    Args:
        counties (list): List of counties to validate, or None for all counties
        
    Returns:
        bool: True if validation passed, False otherwise
    """
    logging.info("Validating collected data")
    
    if counties is None:
        counties = COUNTIES
    
    data_types = ["trails", "parks", "poi"]
    all_valid = True
    
    for county in counties:
        county_lower = county.lower()
        for data_type in data_types:
            file_path = RAW_DATA_DIR / f"{county_lower}_{data_type}_raw.json"
            
            if not file_path.exists():
                logging.warning(f"Missing data file: {file_path}")
                all_valid = False
                continue
                
            # Check file size
            if file_path.stat().st_size < 100:  # Arbitrary small size
                logging.warning(f"Suspiciously small data file: {file_path}")
                all_valid = False
                
            # Basic JSON validation
            try:
                with open(file_path, 'r') as f:
                    data = json.load(f)
                    
                if 'elements' not in data or len(data['elements']) == 0:
                    logging.warning(f"No elements found in {file_path}")
                    all_valid = False
            except json.JSONDecodeError:
                logging.error(f"Invalid JSON in {file_path}")
                all_valid = False
    
    if all_valid:
        logging.info("Data validation passed")
    else:
        logging.warning("Data validation found issues")
        
    return all_valid


def collect_all_data(counties=None, force=False):
    """
    Collect all data for specified counties.
    
    Args:
        counties (list): List of counties to collect data for, or None for all counties
        force (bool): Force recollection even if data exists
        
    Returns:
        bool: True if collection was successful, False otherwise
    """
    if counties is None:
        counties = COUNTIES
        
    # Ensure raw data directory exists
    RAW_DATA_DIR.mkdir(exist_ok=True)
    
    success = True
    
    for county in counties:
        logging.info(f"Processing {county} County")
        
        # Collect trails
        if collect_trails_for_county(county, force) is None:
            success = False
            
        # Collect parks
        if collect_parks_for_county(county, force) is None:
            success = False
            
        # Collect POIs
        if collect_poi_for_county(county, force) is None:
            success = False
    
    # Validate collected data
    if not validate_collected_data(counties):
        success = False
        
    return success


def parse_arguments():
    """
    Parse command line arguments.
    
    Returns:
        argparse.Namespace: Parsed arguments
    """
    parser = argparse.ArgumentParser(description="Collect hiking trail data from OpenStreetMap")
    parser.add_argument("--county", choices=COUNTIES, help="Only collect data for the specified county")
    parser.add_argument("--force", action="store_true", help="Force recollection even if data already exists")
    
    return parser.parse_args()


def main():
    """Main function to collect all trail data."""
    args = parse_arguments()
    
    logging.info("Starting data collection")
    logging.info(f"Using Overpass API endpoint: {OVERPASS_API_URL}")
    
    counties = [args.county] if args.county else None
    
    if collect_all_data(counties, args.force):
        logging.info("Data collection completed successfully")
        return 0
    else:
        logging.error("Data collection completed with errors")
        return 1


if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)
