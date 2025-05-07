#!/usr/bin/env python3
"""
Test loading environment variables from .env file.
This script demonstrates how to use python-dotenv to load environment variables.
"""

import os
import sys
from dotenv import load_dotenv
from pathlib import Path

def test_env_vars():
    """Test loading environment variables from .env file."""
    print("Testing environment variables loading...")
    
    # Get the project root directory (parent of the data directory)
    project_root = Path(__file__).parent.parent
    
    # Load environment variables from .env file
    env_path = project_root / '.env'
    if not env_path.exists():
        print(f"❌ Error: .env file not found at {env_path}")
        return False
    
    print(f"Loading environment variables from: {env_path}")
    load_dotenv(dotenv_path=env_path)
    
    # List of expected environment variables
    expected_vars = [
        'OPENSTREETMAP_API_KEY',
        'OVERPASS_API_URL',
        'DB_NAME',
        'DEBUG'
    ]
    
    # Check if environment variables are loaded
    print("\nEnvironment variables:")
    all_vars_present = True
    
    for var in expected_vars:
        value = os.getenv(var)
        if value:
            # Mask API keys for security
            if 'API_KEY' in var:
                display_value = value[:4] + '****' if len(value) > 4 else '****'
            else:
                display_value = value
            print(f"✅ {var}: {display_value}")
        else:
            print(f"❌ {var}: Not found")
            all_vars_present = False
    
    if all_vars_present:
        print("\nAll expected environment variables are loaded successfully!")
    else:
        print("\nSome environment variables are missing. Please check your .env file.")
    
    return all_vars_present

if __name__ == "__main__":
    success = test_env_vars()
    sys.exit(0 if success else 1)
