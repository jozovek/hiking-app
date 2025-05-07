#!/usr/bin/env python3
"""
Philadelphia Hiking Trails App - Data Validation and Visualization Script

This script validates the processed trail data and generates visualizations
to help verify the quality and completeness of the data.

Usage:
    python validate_data.py [--county COUNTY]

Options:
    --county COUNTY   Only validate data for the specified county
"""

import os
import json
import logging
import argparse
import sqlite3
import pandas as pd
import geopandas as gpd
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from pathlib import Path
from datetime import datetime

# Set up logging
log_dir = Path("data/logs")
log_dir.mkdir(exist_ok=True)
log_file = log_dir / f"validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"

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
VISUALIZATIONS_DIR = Path("data/visualizations")
VISUALIZATIONS_DIR.mkdir(exist_ok=True)
ASSETS_DIR = Path("assets")
DB_PATH = ASSETS_DIR / "trails.db"


def validate_trails_data(county):
    """
    Validate trails data for a specific county.
    
    Args:
        county (str): County name
        
    Returns:
        tuple: (bool, dict) - Success flag and validation results
    """
    county_lower = county.lower()
    trails_file = PROCESSED_DATA_DIR / f"{county_lower}_trails.geojson"
    
    if not trails_file.exists():
        logging.warning(f"Trails data file not found: {trails_file}")
        return False, {}
    
    try:
        # Load trails data
        gdf = gpd.read_file(trails_file)
        
        # Validate data
        results = {
            'county': county,
            'trail_count': len(gdf),
            'has_name': gdf['name'].notna().sum(),
            'has_difficulty': gdf['difficulty'].notna().sum(),
            'has_length': gdf['length_miles'].notna().sum(),
            'has_start_coords': (gdf['start_lat'].notna() & gdf['start_lon'].notna()).sum(),
            'difficulty_counts': gdf['difficulty'].value_counts().to_dict(),
            'avg_length': gdf['length_miles'].mean(),
            'min_length': gdf['length_miles'].min(),
            'max_length': gdf['length_miles'].max(),
            'total_length': gdf['length_miles'].sum()
        }
        
        # Check for issues
        issues = []
        
        if results['trail_count'] == 0:
            issues.append("No trails found")
        
        if results['has_name'] < results['trail_count']:
            issues.append(f"Missing names: {results['trail_count'] - results['has_name']} trails")
        
        if results['has_difficulty'] < results['trail_count']:
            issues.append(f"Missing difficulty: {results['trail_count'] - results['has_difficulty']} trails")
        
        if results['has_length'] < results['trail_count']:
            issues.append(f"Missing length: {results['trail_count'] - results['has_length']} trails")
        
        if results['has_start_coords'] < results['trail_count']:
            issues.append(f"Missing start coordinates: {results['trail_count'] - results['has_start_coords']} trails")
        
        results['issues'] = issues
        results['has_issues'] = len(issues) > 0
        
        # Log results
        logging.info(f"Validation results for {county}:")
        logging.info(f"  Trail count: {results['trail_count']}")
        logging.info(f"  Difficulty distribution: {results['difficulty_counts']}")
        logging.info(f"  Length statistics: avg={results['avg_length']:.2f}, min={results['min_length']:.2f}, max={results['max_length']:.2f}, total={results['total_length']:.2f} miles")
        
        if results['has_issues']:
            logging.warning(f"  Issues found: {', '.join(issues)}")
        else:
            logging.info("  No issues found")
        
        return True, results
    
    except Exception as e:
        logging.error(f"Error validating trails data for {county}: {str(e)}")
        return False, {}


def validate_trail_points_data(county):
    """
    Validate trail points data for a specific county.
    
    Args:
        county (str): County name
        
    Returns:
        tuple: (bool, dict) - Success flag and validation results
    """
    county_lower = county.lower()
    points_file = PROCESSED_DATA_DIR / f"{county_lower}_trail_points.csv"
    
    if not points_file.exists():
        logging.warning(f"Trail points data file not found: {points_file}")
        return False, {}
    
    try:
        # Load trail points data
        df = pd.read_csv(points_file)
        
        # Validate data
        results = {
            'county': county,
            'point_count': len(df),
            'trail_count': df['trail_id'].nunique(),
            'has_coords': (df['latitude'].notna() & df['longitude'].notna()).sum(),
            'has_sequence': df['sequence'].notna().sum(),
            'points_per_trail': df.groupby('trail_id').size().describe().to_dict()
        }
        
        # Check for issues
        issues = []
        
        if results['point_count'] == 0:
            issues.append("No trail points found")
        
        if results['has_coords'] < results['point_count']:
            issues.append(f"Missing coordinates: {results['point_count'] - results['has_coords']} points")
        
        if results['has_sequence'] < results['point_count']:
            issues.append(f"Missing sequence: {results['point_count'] - results['has_sequence']} points")
        
        results['issues'] = issues
        results['has_issues'] = len(issues) > 0
        
        # Log results
        logging.info(f"Trail points validation results for {county}:")
        logging.info(f"  Point count: {results['point_count']}")
        logging.info(f"  Trail count: {results['trail_count']}")
        logging.info(f"  Points per trail: min={results['points_per_trail']['min']:.0f}, max={results['points_per_trail']['max']:.0f}, avg={results['points_per_trail']['mean']:.2f}")
        
        if results['has_issues']:
            logging.warning(f"  Issues found: {', '.join(issues)}")
        else:
            logging.info("  No issues found")
        
        return True, results
    
    except Exception as e:
        logging.error(f"Error validating trail points data for {county}: {str(e)}")
        return False, {}


def validate_database():
    """
    Validate the SQLite database.
    
    Returns:
        tuple: (bool, dict) - Success flag and validation results
    """
    if not DB_PATH.exists():
        logging.warning(f"Database file not found: {DB_PATH}")
        return False, {}
    
    try:
        # Connect to database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get table counts
        cursor.execute("SELECT COUNT(*) FROM trails")
        trails_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM trail_points")
        points_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(DISTINCT trail_id) FROM trail_points")
        trails_with_points = cursor.fetchone()[0]
        
        # Get metadata
        cursor.execute("SELECT * FROM app_metadata")
        metadata = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Get county distribution
        cursor.execute("SELECT county, COUNT(*) FROM trails GROUP BY county")
        county_counts = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Get difficulty distribution
        cursor.execute("SELECT difficulty, COUNT(*) FROM trails GROUP BY difficulty")
        difficulty_counts = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Validate data
        results = {
            'trails_count': trails_count,
            'points_count': points_count,
            'trails_with_points': trails_with_points,
            'metadata': metadata,
            'county_counts': county_counts,
            'difficulty_counts': difficulty_counts
        }
        
        # Check for issues
        issues = []
        
        if trails_count == 0:
            issues.append("No trails found in database")
        
        if points_count == 0:
            issues.append("No trail points found in database")
        
        if trails_with_points < trails_count:
            issues.append(f"Trails without points: {trails_count - trails_with_points}")
        
        results['issues'] = issues
        results['has_issues'] = len(issues) > 0
        
        # Log results
        logging.info("Database validation results:")
        logging.info(f"  Trails count: {results['trails_count']}")
        logging.info(f"  Points count: {results['points_count']}")
        logging.info(f"  Trails with points: {results['trails_with_points']}")
        logging.info(f"  Metadata: {results['metadata']}")
        logging.info(f"  County distribution: {results['county_counts']}")
        logging.info(f"  Difficulty distribution: {results['difficulty_counts']}")
        
        if results['has_issues']:
            logging.warning(f"  Issues found: {', '.join(issues)}")
        else:
            logging.info("  No issues found")
        
        # Close connection
        conn.close()
        
        return True, results
    
    except Exception as e:
        logging.error(f"Error validating database: {str(e)}")
        return False, {}


def visualize_trails(county):
    """
    Generate visualizations for trails in a specific county.
    
    Args:
        county (str): County name
        
    Returns:
        bool: True if successful, False otherwise
    """
    county_lower = county.lower()
    trails_file = PROCESSED_DATA_DIR / f"{county_lower}_trails.geojson"
    
    if not trails_file.exists():
        logging.warning(f"Trails data file not found: {trails_file}")
        return False
    
    try:
        # Load trails data
        gdf = gpd.read_file(trails_file)
        
        if len(gdf) == 0:
            logging.warning(f"No trails found for {county}")
            return False
        
        # Create output directory
        county_dir = VISUALIZATIONS_DIR / county_lower
        county_dir.mkdir(exist_ok=True)
        
        # 1. Map of all trails
        fig, ax = plt.subplots(figsize=(12, 10))
        gdf.plot(ax=ax, column='difficulty', legend=True, 
                 categorical=True, cmap='viridis', 
                 legend_kwds={'title': 'Difficulty'})
        ax.set_title(f'Hiking Trails in {county} County')
        ax.set_xlabel('Longitude')
        ax.set_ylabel('Latitude')
        ax.grid(True)
        fig.tight_layout()
        fig.savefig(county_dir / 'trails_map.png', dpi=300)
        plt.close(fig)
        
        # 2. Trail length distribution
        fig, ax = plt.subplots(figsize=(10, 6))
        gdf['length_miles'].hist(ax=ax, bins=20)
        ax.set_title(f'Trail Length Distribution in {county} County')
        ax.set_xlabel('Length (miles)')
        ax.set_ylabel('Number of Trails')
        ax.grid(True)
        fig.tight_layout()
        fig.savefig(county_dir / 'trail_length_distribution.png', dpi=300)
        plt.close(fig)
        
        # 3. Difficulty distribution
        fig, ax = plt.subplots(figsize=(8, 6))
        difficulty_counts = gdf['difficulty'].value_counts()
        difficulty_counts.plot.pie(ax=ax, autopct='%1.1f%%', 
                                  colors=['green', 'orange', 'red'])
        ax.set_title(f'Trail Difficulty Distribution in {county} County')
        ax.set_ylabel('')
        fig.tight_layout()
        fig.savefig(county_dir / 'difficulty_distribution.png', dpi=300)
        plt.close(fig)
        
        logging.info(f"Generated visualizations for {county} County")
        return True
    
    except Exception as e:
        logging.error(f"Error generating visualizations for {county}: {str(e)}")
        return False


def generate_summary_report(validation_results):
    """
    Generate a summary report of validation results.
    
    Args:
        validation_results (dict): Validation results for all counties
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Create summary report
        report = {
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'counties': list(validation_results.keys()),
            'total_trails': sum(r.get('trails', {}).get('trail_count', 0) for r in validation_results.values()),
            'total_points': sum(r.get('points', {}).get('point_count', 0) for r in validation_results.values()),
            'county_stats': {},
            'issues': []
        }
        
        # Collect county stats
        for county, results in validation_results.items():
            trails = results.get('trails', {})
            points = results.get('points', {})
            
            report['county_stats'][county] = {
                'trail_count': trails.get('trail_count', 0),
                'point_count': points.get('point_count', 0),
                'total_length': trails.get('total_length', 0),
                'difficulty_distribution': trails.get('difficulty_counts', {})
            }
            
            # Collect issues
            if trails.get('has_issues', False):
                for issue in trails.get('issues', []):
                    report['issues'].append(f"{county} trails: {issue}")
            
            if points.get('has_issues', False):
                for issue in points.get('issues', []):
                    report['issues'].append(f"{county} points: {issue}")
        
        # Add database issues
        if validation_results.get('database', {}).get('has_issues', False):
            for issue in validation_results.get('database', {}).get('issues', []):
                report['issues'].append(f"Database: {issue}")
        
        # Save report
        report_path = VISUALIZATIONS_DIR / 'validation_report.json'
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        # Generate summary visualization
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 7))
        
        # County trail counts
        counties = list(report['county_stats'].keys())
        trail_counts = [report['county_stats'][c]['trail_count'] for c in counties]
        
        ax1.bar(counties, trail_counts)
        ax1.set_title('Trail Count by County')
        ax1.set_ylabel('Number of Trails')
        ax1.tick_params(axis='x', rotation=45)
        
        # Difficulty distribution across all counties
        difficulty_counts = {'Easy': 0, 'Moderate': 0, 'Hard': 0}
        
        for county, stats in report['county_stats'].items():
            for difficulty, count in stats['difficulty_distribution'].items():
                if difficulty in difficulty_counts:
                    difficulty_counts[difficulty] += count
        
        ax2.pie(difficulty_counts.values(), labels=difficulty_counts.keys(),
               autopct='%1.1f%%', colors=['green', 'orange', 'red'])
        ax2.set_title('Overall Trail Difficulty Distribution')
        
        fig.tight_layout()
        fig.savefig(VISUALIZATIONS_DIR / 'summary_visualization.png', dpi=300)
        plt.close(fig)
        
        logging.info(f"Generated summary report at {report_path}")
        return True
    
    except Exception as e:
        logging.error(f"Error generating summary report: {str(e)}")
        return False


def validate_data(counties=None):
    """
    Validate data for specified counties.
    
    Args:
        counties (list): List of counties to validate, or None for all counties
        
    Returns:
        bool: True if validation was successful, False otherwise
    """
    if counties is None:
        counties = COUNTIES
    
    validation_results = {}
    success = True
    
    # Validate each county
    for county in counties:
        logging.info(f"Validating data for {county} County")
        
        # Validate trails data
        trails_success, trails_results = validate_trails_data(county)
        if not trails_success:
            success = False
        
        # Validate trail points data
        points_success, points_results = validate_trail_points_data(county)
        if not points_success:
            success = False
        
        # Generate visualizations
        if trails_success:
            if not visualize_trails(county):
                success = False
        
        # Store results
        validation_results[county] = {
            'trails': trails_results,
            'points': points_results
        }
    
    # Validate database
    db_success, db_results = validate_database()
    if not db_success:
        success = False
    
    validation_results['database'] = db_results
    
    # Generate summary report
    if not generate_summary_report(validation_results):
        success = False
    
    return success


def parse_arguments():
    """
    Parse command line arguments.
    
    Returns:
        argparse.Namespace: Parsed arguments
    """
    parser = argparse.ArgumentParser(description="Validate and visualize trail data")
    parser.add_argument("--county", choices=COUNTIES, help="Only validate data for the specified county")
    
    return parser.parse_args()


def main():
    """Main function to validate data."""
    args = parse_arguments()
    
    logging.info("Starting data validation")
    
    counties = [args.county] if args.county else None
    
    if validate_data(counties):
        logging.info("Data validation completed successfully")
        return 0
    else:
        logging.error("Data validation completed with errors")
        return 1


if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)
