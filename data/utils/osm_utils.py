#!/usr/bin/env python3
"""
OpenStreetMap utility functions for the Philadelphia Hiking Trails app.

This module provides utility functions for working with OpenStreetMap data,
including parsing, filtering, and extracting relevant information.
"""

import json
import logging


def extract_nodes_from_osm_data(osm_data):
    """
    Extract nodes from OSM data.
    
    Args:
        osm_data (dict): Raw OSM data
        
    Returns:
        dict: Dictionary of nodes with node_id as key
    """
    nodes = {}
    
    for element in osm_data.get('elements', []):
        if element.get('type') == 'node':
            node_id = element.get('id')
            if node_id:
                nodes[node_id] = {
                    'lat': element.get('lat'),
                    'lon': element.get('lon'),
                    'tags': element.get('tags', {})
                }
    
    return nodes


def extract_ways_from_osm_data(osm_data):
    """
    Extract ways from OSM data.
    
    Args:
        osm_data (dict): Raw OSM data
        
    Returns:
        dict: Dictionary of ways with way_id as key
    """
    ways = {}
    
    for element in osm_data.get('elements', []):
        if element.get('type') == 'way':
            way_id = element.get('id')
            if way_id:
                ways[way_id] = {
                    'nodes': element.get('nodes', []),
                    'tags': element.get('tags', {})
                }
    
    return ways


def extract_relations_from_osm_data(osm_data):
    """
    Extract relations from OSM data.
    
    Args:
        osm_data (dict): Raw OSM data
        
    Returns:
        dict: Dictionary of relations with relation_id as key
    """
    relations = {}
    
    for element in osm_data.get('elements', []):
        if element.get('type') == 'relation':
            relation_id = element.get('id')
            if relation_id:
                relations[relation_id] = {
                    'members': element.get('members', []),
                    'tags': element.get('tags', {})
                }
    
    return relations


def filter_trail_ways(ways):
    """
    Filter ways to include only those that are likely to be trails.
    
    Args:
        ways (dict): Dictionary of ways
        
    Returns:
        dict: Dictionary of filtered ways
    """
    trail_ways = {}
    
    for way_id, way_data in ways.items():
        tags = way_data.get('tags', {})
        
        # Check if this way is likely to be a trail
        is_trail = False
        
        # Check highway tag
        highway = tags.get('highway')
        if highway in ['path', 'footway', 'track']:
            is_trail = True
        
        # Check route tag
        route = tags.get('route')
        if route == 'hiking':
            is_trail = True
        
        # Check foot tag
        foot = tags.get('foot')
        if foot == 'yes':
            is_trail = True
        
        # Add to trail ways if it's a trail
        if is_trail:
            trail_ways[way_id] = way_data
    
    return trail_ways


def filter_park_ways(ways):
    """
    Filter ways to include only those that are likely to be parks or protected areas.
    
    Args:
        ways (dict): Dictionary of ways
        
    Returns:
        dict: Dictionary of filtered ways
    """
    park_ways = {}
    
    for way_id, way_data in ways.items():
        tags = way_data.get('tags', {})
        
        # Check if this way is likely to be a park or protected area
        is_park = False
        
        # Check leisure tag
        leisure = tags.get('leisure')
        if leisure in ['park', 'nature_reserve']:
            is_park = True
        
        # Check boundary tag
        boundary = tags.get('boundary')
        if boundary == 'protected_area':
            is_park = True
        
        # Add to park ways if it's a park
        if is_park:
            park_ways[way_id] = way_data
    
    return park_ways


def filter_poi_nodes(nodes):
    """
    Filter nodes to include only those that are points of interest for hiking.
    
    Args:
        nodes (dict): Dictionary of nodes
        
    Returns:
        dict: Dictionary of filtered nodes
    """
    poi_nodes = {}
    
    for node_id, node_data in nodes.items():
        tags = node_data.get('tags', {})
        
        # Check if this node is likely to be a POI for hiking
        is_poi = False
        
        # Check tourism tag
        tourism = tags.get('tourism')
        if tourism in ['viewpoint', 'information']:
            is_poi = True
        
        # Check natural tag
        natural = tags.get('natural')
        if natural == 'peak':
            is_poi = True
        
        # Check amenity tag
        amenity = tags.get('amenity')
        if amenity in ['drinking_water', 'parking', 'toilets']:
            is_poi = True
        
        # Check information tag
        information = tags.get('information')
        if information == 'guidepost':
            is_poi = True
        
        # Check leisure tag
        leisure = tags.get('leisure')
        if leisure == 'picnic_table':
            is_poi = True
        
        # Add to POI nodes if it's a POI
        if is_poi:
            poi_nodes[node_id] = node_data
    
    return poi_nodes


def estimate_trail_difficulty(tags, length_miles=None):
    """
    Estimate trail difficulty based on tags and length.
    
    Args:
        tags (dict): Trail tags
        length_miles (float): Trail length in miles
        
    Returns:
        str: Difficulty level ('Easy', 'Moderate', or 'Hard')
    """
    # Default difficulty
    difficulty = 'Moderate'
    
    # Check sac_scale tag
    sac_scale = tags.get('sac_scale')
    if sac_scale:
        if sac_scale in ['hiking', 'mountain_hiking']:
            difficulty = 'Easy'
        elif sac_scale in ['demanding_mountain_hiking', 'alpine_hiking']:
            difficulty = 'Moderate'
        else:
            difficulty = 'Hard'
        return difficulty
    
    # Check trail_visibility tag
    trail_visibility = tags.get('trail_visibility')
    if trail_visibility:
        if trail_visibility in ['excellent', 'good']:
            difficulty = 'Easy'
        elif trail_visibility == 'intermediate':
            difficulty = 'Moderate'
        else:
            difficulty = 'Hard'
        return difficulty
    
    # Check surface tag
    surface = tags.get('surface')
    if surface:
        if surface in ['paved', 'asphalt', 'concrete', 'paving_stones']:
            difficulty = 'Easy'
        elif surface in ['gravel', 'fine_gravel', 'compacted']:
            difficulty = 'Easy'
        elif surface in ['dirt', 'earth', 'grass']:
            difficulty = 'Moderate'
        else:
            difficulty = 'Hard'
        return difficulty
    
    # Check trail length if available
    if length_miles:
        if length_miles < 2:
            difficulty = 'Easy'
        elif length_miles < 5:
            difficulty = 'Moderate'
        else:
            difficulty = 'Hard'
    
    return difficulty


def get_trail_name(tags, way_id=None):
    """
    Get trail name from tags, or generate a default name if not available.
    
    Args:
        tags (dict): Trail tags
        way_id (int): Way ID for generating default name
        
    Returns:
        str: Trail name
    """
    # Check name tag
    name = tags.get('name')
    if name:
        return name
    
    # Check ref tag
    ref = tags.get('ref')
    if ref:
        return f"Trail {ref}"
    
    # Generate default name
    if way_id:
        return f"Trail {way_id}"
    
    return "Unnamed Trail"


def load_osm_data(file_path):
    """
    Load OSM data from a JSON file.
    
    Args:
        file_path (str): Path to the JSON file
        
    Returns:
        dict: OSM data
    """
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        logging.error(f"Error loading OSM data from {file_path}: {str(e)}")
        return {}
