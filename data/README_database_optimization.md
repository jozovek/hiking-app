# Database Optimization for Philadelphia Hiking Trails App

This document explains the database optimization process for the Philadelphia Hiking Trails app. The optimization improves query performance, especially for location-based searches and filtering operations.

## Overview

The database optimization consists of three main components:

1. **Database Indexing**: Adding indexes to frequently queried fields to speed up database lookups
2. **Query Optimization**: Using more efficient SQL queries, particularly for location-based searches
3. **Query Caching**: Caching query results to avoid redundant database access

## Database Indexing

The `optimize_database.py` script adds indexes to the SQLite database for frequently queried fields. This significantly improves query performance, especially for filtering and sorting operations.

### Indexed Fields

The script adds indexes for the following fields:

- `trails.difficulty`: For filtering trails by difficulty level
- `trails.length`: For filtering trails by length
- `trails.elevation_gain`: For filtering trails by elevation gain
- `trails.surface_type`: For filtering trails by surface type
- `trails.route_type`: For filtering trails by route type
- `trails.is_accessible`: For filtering trails by accessibility
- `trails.latitude, trails.longitude`: For location-based queries
- `trails.park_id`: For filtering trails by park
- `pois.trail_id`: For finding points of interest for a specific trail
- `pois.type`: For filtering points of interest by type
- `parks.latitude, parks.longitude`: For location-based park queries

### Running the Script

To run the database optimization script:

```bash
python data/optimize_database.py [--db-path DB_PATH]
```

Options:
- `--db-path DB_PATH`: Path to the database file (default: mobile/assets/database/trails.db)

The script will:
1. Check if the database exists
2. Add indexes for frequently queried fields
3. Run ANALYZE to update statistics
4. Run VACUUM to optimize storage

## Query Optimization

The mobile app includes a `QueryOptimizationService` that provides optimized versions of database queries. The key optimizations include:

### Haversine Formula for Distance Calculations

For location-based searches, we use the Haversine formula to calculate accurate distances between points on the Earth's surface. This is more accurate than simple bounding box calculations, especially for larger search radii.

```sql
SELECT *, 
  (3959 * acos(cos(radians(?)) * cos(radians(latitude)) * 
  cos(radians(longitude) - radians(?)) + 
  sin(radians(?)) * sin(radians(latitude)))) AS distance 
FROM trails 
WHERE (3959 * acos(cos(radians(?)) * cos(radians(latitude)) * 
      cos(radians(longitude) - radians(?)) + 
      sin(radians(?)) * sin(radians(latitude)))) < ? 
ORDER BY distance ASC
```

### Dynamic Query Building

For complex filtering operations, we build SQL queries dynamically based on the filter parameters. This ensures that only the necessary conditions are included in the query, improving performance.

## Query Caching

The `QueryCacheService` provides caching for frequently accessed data. This reduces database access and improves app performance, especially for repeated queries.

### Cached Queries

The service caches the following types of queries:

- Individual trails by ID
- Trails near a specific location
- Parks near a specific location
- Points of interest for a specific trail
- Filtered trails based on search criteria

### Cache Management

The cache is managed with the following features:

- **LRU (Least Recently Used) Eviction**: When the cache reaches its maximum size, the least recently used items are removed
- **Time-Based Expiration**: Cache items expire after a configurable time period (default: 24 hours)
- **Cache Pruning**: Expired items are automatically removed during initialization
- **Cache Clearing**: The cache can be manually cleared if needed

## Integration with the App

The optimizations are integrated into the app through the `EnhancedDatabaseService`, which wraps the original `DatabaseService` and adds optimization and caching. The app is updated to use this enhanced service instead of the original one.

## Performance Impact

These optimizations significantly improve the app's performance, especially for:

- Location-based searches (finding trails near the user)
- Complex filtering operations (filtering trails by multiple criteria)
- Repeated queries (accessing the same data multiple times)

The improvements are particularly noticeable in offline mode, where efficient database access is critical for a smooth user experience.
