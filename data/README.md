# Philadelphia Hiking Trails Data Processing

This directory contains scripts for collecting, processing, and creating the SQLite database for the Philadelphia Hiking Trails app.

## Directory Structure

- `raw/`: Raw data collected from OpenStreetMap and other sources
- `processed/`: Cleaned and processed data
- `visualizations/`: Data visualizations and validation outputs
- `collect_trails.py`: Script to collect trail data from OpenStreetMap (to be implemented)
- `process_data.py`: Script to process and clean the collected data (to be implemented)
- `create_database.py`: Script to create the SQLite database (to be implemented)
- `validate_data.py`: Script to validate and visualize the data (to be implemented)
- `run_data_pipeline.py`: Script to run the entire data pipeline (to be implemented)
- `requirements.txt`: Python dependencies

## Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Verify the environment setup:
   ```bash
   python verify_environment.py
   ```
   This will check that all required packages are installed correctly.

4. Test environment variables loading:
   ```bash
   python test_env.py
   ```
   This will verify that environment variables from the .env file are loaded correctly.

## Running the Data Pipeline (Future Implementation)

To run the complete data pipeline:

```bash
python run_data_pipeline.py
```

This will:
1. Collect trail data from OpenStreetMap
2. Process and clean the data
3. Create the SQLite database in the `assets/` directory

## Individual Scripts (Future Implementation)

You can also run each script individually:

```bash
# Collect data
python collect_trails.py

# Process data
python process_data.py

# Create database
python create_database.py

# Validate and visualize data
python validate_data.py
```

## Output

The main output will be the SQLite database file at `assets/trails.db`, which will be bundled with the app.
