"""
Utility functions for the Philadelphia Hiking Trails app.

This package provides utility functions for working with trail data,
including spatial operations, graph-based trail reconstruction, and
OpenStreetMap data processing.
"""

from .spatial_utils import (
    haversine,
    calculate_trail_length,
    create_line_string,
    buffer_point,
    find_intersecting_trails,
    find_nearby_pois,
    simplify_geometry
)

from .graph_utils import (
    create_graph_from_osm_elements,
    find_connected_components,
    find_endpoints,
    find_junctions,
    find_path_between_endpoints,
    create_trail_from_path,
    decompose_complex_network,
    reconstruct_trails
)

from .osm_utils import (
    extract_nodes_from_osm_data,
    extract_ways_from_osm_data,
    extract_relations_from_osm_data,
    filter_trail_ways,
    filter_park_ways,
    filter_poi_nodes,
    estimate_trail_difficulty,
    get_trail_name,
    load_osm_data
)

__all__ = [
    # Spatial utils
    'haversine',
    'calculate_trail_length',
    'create_line_string',
    'buffer_point',
    'find_intersecting_trails',
    'find_nearby_pois',
    'simplify_geometry',
    
    # Graph utils
    'create_graph_from_osm_elements',
    'find_connected_components',
    'find_endpoints',
    'find_junctions',
    'find_path_between_endpoints',
    'create_trail_from_path',
    'decompose_complex_network',
    'reconstruct_trails',
    
    # OSM utils
    'extract_nodes_from_osm_data',
    'extract_ways_from_osm_data',
    'extract_relations_from_osm_data',
    'filter_trail_ways',
    'filter_park_ways',
    'filter_poi_nodes',
    'estimate_trail_difficulty',
    'get_trail_name',
    'load_osm_data'
]
