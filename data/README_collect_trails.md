# Data Collection Script for Philadelphia Hiking Trails App

This document provides information about the `collect_trails.py` script, which is used to collect hiking trail data from OpenStreetMap for the Philadelphia Hiking Trails app.

## Overview

The script uses the Overpass API to query OpenStreetMap for hiking trails, parks, and points of interest in Philadelphia and surrounding counties (Bucks, Chester, Delaware, and Montgomery). The raw data is saved as JSON files for further processing.

## Prerequisites

- Python 3.x
- Required packages (installed via `pip install -r requirements.txt`):
  - overpass
  - requests
  - python-dotenv

## Usage

```bash
# Collect data for all counties
python collect_trails.py

# Collect data for a specific county
python collect_trails.py --county Philadelphia

# Force recollection even if data already exists
python collect_trails.py --county Philadelphia --force
```

## Command-line Options

- `--county`: Only collect data for the specified county. Choices are: Philadelphia, Bucks, Chester, Delaware, Montgomery.
- `--force`: Force recollection even if data already exists.

## Output

The script creates the following files:

- `data/raw/{county}_trails_raw.json`: Raw trail data for each county
- `data/raw/{county}_parks_raw.json`: Raw park data for each county
- `data/raw/{county}_poi_raw.json`: Raw POI data for each county
- `data/raw/cache/`: Cached copies of the raw data
- `data/logs/collection_{timestamp}.log`: Log file for each collection run

## Data Types

The script collects three types of data:

1. **Trails**: Hiking trails and paths
   - Includes: footways, paths, tracks, and hiking routes
   - File: `{county}_trails_raw.json`

2. **Parks**: Parks and protected areas
   - Includes: parks, protected areas, and nature reserves
   - File: `{county}_parks_raw.json`

3. **POIs**: Points of interest related to hiking
   - Includes: viewpoints, peaks, drinking water sources, parking, toilets, guideposts, information points, and picnic tables
   - File: `{county}_poi_raw.json`

## Example Data

### Trails

```json
{
  "type": "way",
  "id": 12111136,
  "nodes": [
    109753566,
    2049296390
  ],
  "tags": {
    "highway": "footway",
    "source": "survey",
    "tiger:cfcc": "A41"
  }
}
```

### Parks

```json
{
  "type": "way",
  "id": 25271691,
  "nodes": [
    3429163970,
    3408446151,
    775433885,
    3431047125,
    3431047126,
    3431047124,
    3431047134
  ],
  "tags": {
    "leisure": "park",
    "name": "Example Park"
  }
}
```

### POIs

```json
{
  "type": "node",
  "id": 357287118,
  "lat": 39.9837238,
  "lon": -75.2240694,
  "tags": {
    "ele": "64",
    "gnis:feature_id": "1175535",
    "name": "Georges Hill",
    "natural": "peak"
  }
}
```

## Next Steps

After collecting the data, the next step is to process it using the `process_data.py` script, which will:

1. Parse the raw JSON data
2. Extract relevant trail information
3. Clean and normalize the data
4. Calculate additional metrics (like trail length)
5. Prepare the data for the SQLite database

## Troubleshooting

- If the script fails to collect data, check the log file in `data/logs/` for error messages.
- If the Overpass API is unavailable, the script will try to use cached data if available.
- If the script is taking too long, try collecting data for one county at a time.
