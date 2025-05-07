#!/usr/bin/env python3
"""
Philadelphia Hiking Trails App - Trail Reconstruction Script

This script reconstructs complete trails from fragmented OpenStreetMap data
using graph-based algorithms. It takes the raw OSM data collected by collect_trails.py
and produces structured trail data for further processing.

Usage:
    python reconstruct_trails.py [--county COUNTY] [--force]

Options:
    --county COUNTY   Only process data for the specified county
    --force           Force reprocessing even if output files already exist
"""

import os
import json
import logging
import argparse
from pathlib import Path
from datetime import datetime

import pandas as pd
import geopandas as gpd
import networkx as nx
from shapely.geometry import LineString, Point

from utils import (
    # OSM utils
    load_osm_data,
    extract_nodes_from_osm_data,
    extract_ways_from_osm_data,
    filter_trail_ways,
    estimate_trail_difficulty,
    get_trail_name,
    
    # Graph utils
    reconstruct_trails,
    
    # Spatial utils
    calculate_trail_length,
    simplify_geometry
)

# Set up logging
log_dir = Path("data/logs")
log_dir.mkdir(exist_ok=True)
log_file = log_dir / f"reconstruction_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

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
RAW_DATA_DIR = Path("data/raw")
PROCESSED_DATA_DIR = Path("data/processed")
PROCESSED_DATA_DIR.mkdir(exist_ok=True)


def should_process(county, force=False):
    """
    Check if data should be processed or already exists.
    
    Args:
        county (str): County name
        force (bool): Force reprocessing even if output files already exist
        
    Returns:
        bool: True if data should be processed, False otherwise
    """
    output_path = PROCESSED_DATA_DIR / f"{county.lower()}_trails.geojson"
    return force or not output_path.exists()


def process_county(county, force=False):
    """
    Process trail data for a specific county.
    
    Args:
        county (str): County name
        force (bool): Force reprocessing even if output files already exist
        
    Returns:
        bool: True if processing was successful, False otherwise
    """
    county_lower = county.lower()
    
    # Check if data should be processed
    if not should_process(county, force):
        logging.info(f"Processed data for {county} already exists, skipping processing")
        return True
    
    logging.info(f"Processing trail data for {county} County")
    
    # Load raw trail data
    trails_file = RAW_DATA_DIR / f"{county_lower}_trails_raw.json"
    if not trails_file.exists():
        logging.error(f"Raw trail data file not found: {trails_file}")
        return False
    
    try:
        # Load OSM data
        osm_data = load_osm_data(trails_file)
        if not osm_data:
            logging.error(f"Failed to load OSM data from {trails_file}")
            return False
        
        # Extract nodes and ways
        nodes = extract_nodes_from_osm_data(osm_data)
        ways = extract_ways_from_osm_data(osm_data)
        
        logging.info(f"Extracted {len(nodes)} nodes and {len(ways)} ways")
        
        # Filter ways to include only trails
        trail_ways = filter_trail_ways(ways)
        logging.info(f"Filtered to {len(trail_ways)} trail ways")
        
        # Reconstruct trails
        trails = reconstruct_trails(nodes, trail_ways)
        logging.info(f"Reconstructed {len(trails)} trails")
        
        # Process trails
        processed_trails = []
        for i, trail in enumerate(trails):
            # Skip invalid trails
            if not trail or 'geometry' not in trail:
                continue
            
            # Get trail attributes
            trail_id = f"{county_lower}_{i+1}"
            tags = trail.get('tags', {})
            name = get_trail_name(tags, i+1)
            length_miles = trail.get('length_miles', 0)
            difficulty = estimate_trail_difficulty(tags, length_miles)
            
            # Get start coordinates
            coordinates = trail.get('coordinates', [])
            if coordinates:
                start_lon, start_lat = coordinates[0]
            else:
                start_lon, start_lat = None, None
            
            # Simplify geometry
            geometry = simplify_geometry(trail['geometry'])
            
            # Create processed trail
            processed_trail = {
                'id': trail_id,
                'name': name,
                'difficulty': difficulty,
                'length_miles': round(length_miles, 2),
                'county': county,
                'start_lat': start_lat,
                'start_lon': start_lon,
                'status': 'open',
                'geometry': geometry
            }
            
            processed_trails.append(processed_trail)
        
        # Create GeoDataFrame
        if processed_trails:
            gdf = gpd.GeoDataFrame(processed_trails, crs="EPSG:4326")
            
            # Save to GeoJSON
            output_path = PROCESSED_DATA_DIR / f"{county_lower}_trails.geojson"
            gdf.to_file(output_path, driver='GeoJSON')
            
            # Save to CSV (without geometry column)
            csv_path = PROCESSED_DATA_DIR / f"{county_lower}_trails.csv"
            gdf_csv = gdf.drop(columns=['geometry'])
            gdf_csv.to_csv(csv_path, index=False)
            
            logging.info(f"Saved {len(processed_trails)} processed trails to {output_path}")
            
            # Process trail points
            process_trail_points(county, processed_trails)
            
            return True
        else:
            logging.warning(f"No valid trails found for {county}")
            return False
        
    except Exception as e:
        logging.error(f"Error processing trail data for {county}: {str(e)}")
        return False


def process_trail_points(county, trails):
    """
    Process trail points for a specific county.
    
    Args:
        county (str): County name
        trails (list): List of processed trails
        
    Returns:
        bool: True if processing was successful, False otherwise
    """
    county_lower = county.lower()
    
    try:
        # Create trail points
        trail_points = []
        
        for trail in trails:
            trail_id = trail['id']
            geometry = trail['geometry']
            
            # Extract coordinates from geometry
            if isinstance(geometry, LineString):
                coordinates = list(geometry.coords)
                
                # Create trail points
                for i, (lon, lat) in enumerate(coordinates):
                    point = {
                        'trail_id': trail_id,
                        'sequence': i,
                        'latitude': lat,
                        'longitude': lon
                    }
                    trail_points.append(point)
        
        # Create DataFrame
        if trail_points:
            df = pd.DataFrame(trail_points)
            
            # Save to CSV
            output_path = PROCESSED_DATA_DIR / f"{county_lower}_trail_points.csv"
            df.to_csv(output_path, index=False)
            
            logging.info(f"Saved {len(trail_points)} trail points to {output_path}")
            
            return True
        else:
            logging.warning(f"No trail points found for {county}")
            return False
        
    except Exception as e:
        logging.error(f"Error processing trail points for {county}: {str(e)}")
        return False


def process_all_counties(counties=None, force=False):
    """
    Process trail data for all specified counties.
    
    Args:
        counties (list): List of counties to process, or None for all counties
        force (bool): Force reprocessing even if output files already exist
        
    Returns:
        bool: True if processing was successful for all counties, False otherwise
    """
    if counties is None:
        counties = COUNTIES
    
    success = True
    
    for county in counties:
        if not process_county(county, force):
            success = False
    
    return success


def parse_arguments():
    """
    Parse command line arguments.
    
    Returns:
        argparse.Namespace: Parsed arguments
    """
    parser = argparse.ArgumentParser(description="Reconstruct trails from OpenStreetMap data")
    parser.add_argument("--county", choices=COUNTIES, help="Only process data for the specified county")
    parser.add_argument("--force", action="store_true", help="Force reprocessing even if output files already exist")
    
    return parser.parse_args()


def main():
    """Main function to reconstruct trails."""
    args = parse_arguments()
    
    logging.info("Starting trail reconstruction")
    
    counties = [args.county] if args.county else None
    
    if process_all_counties(counties, args.force):
        logging.info("Trail reconstruction completed successfully")
        return 0
    else:
        logging.error("Trail reconstruction completed with errors")
        return 1


if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)
