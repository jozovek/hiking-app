#!/bin/bash
# Philadelphia Hiking Trails App - Data Processing Pipeline Runner
#
# This script runs the complete data processing pipeline for a specific county.
#
# Usage:
#   ./data/run_pipeline.sh [county] [--force]
#
# Arguments:
#   county: County name (Philadelphia, Bucks, Chester, Delaware, Montgomery)
#           If not specified, processes all counties.
#   --force: Force reprocessing even if output files already exist

# Set script to exit on error
set -e

# Get the directory of the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Default values
COUNTY=""
FORCE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE="--force"
            shift
            ;;
        *)
            if [[ -z "$COUNTY" ]]; then
                COUNTY="$1"
            fi
            shift
            ;;
    esac
done

# Validate county if specified
if [[ -n "$COUNTY" ]]; then
    VALID_COUNTIES=("Philadelphia" "Bucks" "Chester" "Delaware" "Montgomery")
    VALID=0
    for c in "${VALID_COUNTIES[@]}"; do
        if [[ "$c" == "$COUNTY" ]]; then
            VALID=1
            break
        fi
    done
    
    if [[ $VALID -eq 0 ]]; then
        echo "Error: Invalid county '$COUNTY'"
        echo "Valid counties: ${VALID_COUNTIES[*]}"
        exit 1
    fi
    
    COUNTY_ARG="--county $COUNTY"
else
    COUNTY_ARG=""
    COUNTY="all counties"
fi

# Ensure virtual environment is activated
if [[ -z "$VIRTUAL_ENV" ]]; then
    if [[ -d "venv" ]]; then
        echo "Activating virtual environment..."
        source venv/bin/activate
    else
        echo "Warning: Virtual environment not found. Make sure dependencies are installed."
    fi
fi

# Create timestamp for log file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_DIR="data/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/pipeline_${TIMESTAMP}.log"

# Log function
log() {
    echo "[$(date +"%Y-%m-%d %H:%M:%S")] $1" | tee -a "$LOG_FILE"
}

# Run the pipeline
log "Starting data processing pipeline for $COUNTY"

# Step 1: Data Collection
log "Step 1: Collecting data..."
./data/collect_trails.py $COUNTY_ARG $FORCE
log "Data collection completed"

# Step 2: Trail Reconstruction
log "Step 2: Reconstructing trails..."
./data/reconstruct_trails.py $COUNTY_ARG $FORCE
log "Trail reconstruction completed"

# Step 3: Database Creation
log "Step 3: Creating database..."
./data/create_database.py $COUNTY_ARG $FORCE
log "Database creation completed"

# Step 4: Data Validation
log "Step 4: Validating data..."
./data/validate_data.py $COUNTY_ARG
log "Data validation completed"

log "Data processing pipeline completed successfully"
log "Output files:"
log "  - SQLite Database: assets/trails.db"
log "  - Validation Report: data/visualizations/validation_report.json"
log "  - Visualizations: data/visualizations/"

echo ""
echo "Pipeline completed successfully!"
echo "Log file: $LOG_FILE"
