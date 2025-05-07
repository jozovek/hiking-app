#!/usr/bin/env python3
"""
Spatial utility functions for the Philadelphia Hiking Trails app.

This module provides utility functions for spatial operations on trail data,
including distance calculations, geometric operations, and coordinate transformations.
"""

import numpy as np
from shapely.geometry import Point, LineString, MultiLineString
import geopandas as gpd
from math import radians, cos, sin, asin, sqrt


def haversine(lon1, lat1, lon2, lat2):
    """
    Calculate the great circle distance between two points in miles.
    
    Args:
        lon1 (float): Longitude of point 1
        lat1 (float): Latitude of point 1
        lon2 (float): Longitude of point 2
        lat2 (float): Latitude of point 2
        
    Returns:
        float: Distance in miles
    """
    # Convert decimal degrees to radians
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 3956  # Radius of earth in miles
    return c * r


def calculate_trail_length(coordinates):
    """
    Calculate the length of a trail in miles based on its coordinates.
    
    Args:
        coordinates (list): List of (longitude, latitude) tuples
        
    Returns:
        float: Trail length in miles
    """
    length = 0
    for i in range(len(coordinates) - 1):
        lon1, lat1 = coordinates[i]
        lon2, lat2 = coordinates[i + 1]
        length += haversine(lon1, lat1, lon2, lat2)
    
    return length


def create_line_string(coordinates):
    """
    Create a Shapely LineString from a list of coordinates.
    
    Args:
        coordinates (list): List of (longitude, latitude) tuples
        
    Returns:
        shapely.geometry.LineString: LineString object
    """
    return LineString(coordinates)


def buffer_point(point, distance_miles):
    """
    Create a buffer around a point with a specified radius in miles.
    
    Args:
        point (tuple): (longitude, latitude) tuple
        distance_miles (float): Buffer radius in miles
        
    Returns:
        shapely.geometry.Polygon: Buffer polygon
    """
    # Convert miles to degrees (approximate)
    # 1 degree of latitude is approximately 69 miles
    distance_degrees = distance_miles / 69
    
    return Point(point).buffer(distance_degrees)


def find_intersecting_trails(trail_geometry, all_trails_gdf):
    """
    Find trails that intersect with a given trail.
    
    Args:
        trail_geometry (shapely.geometry.LineString): Geometry of the trail
        all_trails_gdf (geopandas.GeoDataFrame): GeoDataFrame containing all trails
        
    Returns:
        geopandas.GeoDataFrame: GeoDataFrame containing intersecting trails
    """
    return all_trails_gdf[all_trails_gdf.intersects(trail_geometry)]


def find_nearby_pois(trail_geometry, pois_gdf, distance_miles=0.1):
    """
    Find POIs that are within a specified distance of a trail.
    
    Args:
        trail_geometry (shapely.geometry.LineString): Geometry of the trail
        pois_gdf (geopandas.GeoDataFrame): GeoDataFrame containing POIs
        distance_miles (float): Maximum distance in miles
        
    Returns:
        geopandas.GeoDataFrame: GeoDataFrame containing nearby POIs
    """
    # Convert miles to degrees (approximate)
    distance_degrees = distance_miles / 69
    
    # Buffer the trail
    trail_buffer = trail_geometry.buffer(distance_degrees)
    
    # Find POIs within the buffer
    return pois_gdf[pois_gdf.intersects(trail_buffer)]


def simplify_geometry(geometry, tolerance=0.0001):
    """
    Simplify a geometry to reduce the number of points.
    
    Args:
        geometry (shapely.geometry.BaseGeometry): Geometry to simplify
        tolerance (float): Tolerance for simplification
        
    Returns:
        shapely.geometry.BaseGeometry: Simplified geometry
    """
    return geometry.simplify(tolerance)
