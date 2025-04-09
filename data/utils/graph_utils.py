#!/usr/bin/env python3
"""
Graph utility functions for the Philadelphia Hiking Trails app.

This module provides utility functions for graph-based operations on trail data,
including graph construction, path finding, and trail reconstruction.
"""

import logging
import networkx as nx
from shapely.geometry import LineString
from .spatial_utils import haversine


def create_graph_from_osm_elements(nodes, ways):
    """
    Create a NetworkX graph from OSM nodes and ways.
    
    Args:
        nodes (dict): Dictionary of OSM nodes with node_id as key
        ways (dict): Dictionary of OSM ways with way_id as key
        
    Returns:
        networkx.Graph: Graph representing the trail network
    """
    G = nx.Graph()
    
    # Add all nodes to the graph
    for node_id, node_data in nodes.items():
        G.add_node(node_id, **node_data)
    
    # Add all ways as edges
    for way_id, way_data in ways.items():
        # Skip ways with fewer than 2 nodes
        if len(way_data['nodes']) < 2:
            continue
            
        # Add edges between consecutive nodes in the way
        for i in range(len(way_data['nodes']) - 1):
            node1 = way_data['nodes'][i]
            node2 = way_data['nodes'][i + 1]
            
            # Skip if either node is not in the graph
            if node1 not in G or node2 not in G:
                continue
                
            # Calculate distance between nodes
            distance = haversine(
                G.nodes[node1]['lon'], G.nodes[node1]['lat'],
                G.nodes[node2]['lon'], G.nodes[node2]['lat']
            )
            
            # Add edge with attributes
            G.add_edge(
                node1, node2,
                distance=distance,
                way_id=way_id,
                **way_data.get('tags', {})
            )
    
    return G


def find_connected_components(G):
    """
    Find connected components in the graph.
    
    Args:
        G (networkx.Graph): Graph representing the trail network
        
    Returns:
        list: List of sets of nodes, each set representing a connected component
    """
    return list(nx.connected_components(G))


def find_endpoints(G):
    """
    Find endpoints (nodes with degree 1) in the graph.
    
    Args:
        G (networkx.Graph): Graph representing the trail network
        
    Returns:
        list: List of node IDs that are endpoints
    """
    return [n for n in G.nodes() if G.degree(n) == 1]


def find_junctions(G):
    """
    Find junctions (nodes with degree > 2) in the graph.
    
    Args:
        G (networkx.Graph): Graph representing the trail network
        
    Returns:
        list: List of node IDs that are junctions
    """
    return [n for n in G.nodes() if G.degree(n) > 2]


def find_path_between_endpoints(G, start, end):
    """
    Find the shortest path between two endpoints.
    
    Args:
        G (networkx.Graph): Graph representing the trail network
        start (int): Start node ID
        end (int): End node ID
        
    Returns:
        list: List of node IDs representing the path
    """
    try:
        return nx.shortest_path(G, start, end, weight='distance')
    except nx.NetworkXNoPath:
        return None


def create_trail_from_path(G, path):
    """
    Create a trail object from a path in the graph.
    
    Args:
        G (networkx.Graph): Graph representing the trail network
        path (list): List of node IDs representing the path
        
    Returns:
        dict: Trail object with attributes
    """
    if not path or len(path) < 2:
        return None
        
    # Extract coordinates
    coordinates = [(G.nodes[n]['lon'], G.nodes[n]['lat']) for n in path]
    
    # Calculate length
    length = sum(G[path[i]][path[i+1]]['distance'] for i in range(len(path)-1))
    
    # Collect tags from edges
    tags = {}
    for i in range(len(path)-1):
        edge_tags = {k: v for k, v in G[path[i]][path[i+1]].items() 
                    if k not in ['distance', 'way_id']}
        for k, v in edge_tags.items():
            if k not in tags:
                tags[k] = []
            tags[k].append(v)
    
    # Resolve tag conflicts (most common value wins)
    resolved_tags = {}
    for k, v in tags.items():
        if not v:
            continue
        # Count occurrences of each value
        value_counts = {}
        for val in v:
            if val not in value_counts:
                value_counts[val] = 0
            value_counts[val] += 1
        # Use the most common value
        resolved_tags[k] = max(value_counts.items(), key=lambda x: x[1])[0]
    
    # Create trail object
    trail = {
        'geometry': LineString(coordinates),
        'coordinates': coordinates,
        'length_miles': length,
        'tags': resolved_tags
    }
    
    # Extract name if available
    if 'name' in resolved_tags:
        trail['name'] = resolved_tags['name']
    
    # Extract highway type if available
    if 'highway' in resolved_tags:
        trail['highway'] = resolved_tags['highway']
    
    return trail


def decompose_complex_network(G):
    """
    Decompose a complex trail network into individual trails.
    
    Args:
        G (networkx.Graph): Graph representing the trail network
        
    Returns:
        list: List of trails
    """
    trails = []
    
    # Find endpoints
    endpoints = find_endpoints(G)
    
    # If there are exactly two endpoints, this is a simple trail
    if len(endpoints) == 2:
        logging.info(f"Simple trail with 2 endpoints - finding path")
        path = find_path_between_endpoints(G, endpoints[0], endpoints[1])
        if path:
            trail = create_trail_from_path(G, path)
            if trail:
                trails.append(trail)
        return trails
    
    # For more complex networks, find all pairs of endpoints
    total_pairs = len(endpoints) * (len(endpoints) - 1) // 2
    logging.info(f"Complex network with {len(endpoints)} endpoints - processing {total_pairs} endpoint pairs")
    
    pair_counter = 0
    for i in range(len(endpoints)):
        for j in range(i+1, len(endpoints)):
            pair_counter += 1
            if pair_counter % 100 == 0:  # Log every 100 pairs
                logging.info(f"Processing endpoint pair {pair_counter}/{total_pairs}")
                
            start = endpoints[i]
            end = endpoints[j]
            
            # Find path between endpoints
            path = find_path_between_endpoints(G, start, end)
            if path:
                trail = create_trail_from_path(G, path)
                if trail:
                    trails.append(trail)
    
    logging.info(f"Completed processing {total_pairs} endpoint pairs, found {len(trails)} trails")
    return trails


def reconstruct_trails(nodes, ways):
    """
    Reconstruct trails from OSM nodes and ways.
    
    Args:
        nodes (dict): Dictionary of OSM nodes with node_id as key
        ways (dict): Dictionary of OSM ways with way_id as key
        
    Returns:
        list: List of reconstructed trails
    """
    # Create graph
    G = create_graph_from_osm_elements(nodes, ways)
    logging.info(f"Created graph with {G.number_of_nodes()} nodes and {G.number_of_edges()} edges")
    
    # Find connected components
    components = find_connected_components(G)
    logging.info(f"Found {len(components)} connected components")
    
    # Process each connected component
    trails = []
    for i, component in enumerate(components):
        logging.info(f"Processing component {i+1}/{len(components)} with {len(component)} nodes")
        
        # Extract subgraph for this component
        subgraph = G.subgraph(component).copy()
        
        # Log the number of endpoints in this component
        endpoints = find_endpoints(subgraph)
        logging.info(f"Component {i+1} has {len(endpoints)} endpoints")
        
        # Decompose into trails
        component_trails = decompose_complex_network(subgraph)
        logging.info(f"Extracted {len(component_trails)} trails from component {i+1}")
        trails.extend(component_trails)
    
    return trails
