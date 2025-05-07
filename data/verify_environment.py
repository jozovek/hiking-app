#!/usr/bin/env python3
"""
Verify that the Python environment is set up correctly.
This script attempts to import all the required packages and prints a success message if all imports work.
"""

import sys
import os
from datetime import datetime

def check_imports():
    """Check that all required packages can be imported."""
    print("Verifying Python environment setup...")
    print(f"Python version: {sys.version}")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\nAttempting to import required packages:")
    
    # List of packages to check
    packages = [
        "pandas",
        "geopandas",
        "numpy",
        "shapely",
        "requests",
        "overpass",
        "osmnx",
        "beautifulsoup4",
        "matplotlib",
        "dotenv"
    ]
    
    # Try to import each package
    successful_imports = []
    failed_imports = []
    
    for package in packages:
        try:
            if package == "beautifulsoup4":
                import bs4
                print(f"✅ {package} (as bs4) {bs4.__version__}")
                successful_imports.append(package)
            elif package == "dotenv":
                import dotenv
                # python-dotenv might not have __version__ attribute
                version = getattr(dotenv, "__version__", "version not available")
                print(f"✅ {package} {version}")
                successful_imports.append(package)
            else:
                module = __import__(package)
                version = getattr(module, "__version__", "unknown version")
                print(f"✅ {package} {version}")
                successful_imports.append(package)
        except ImportError:
            print(f"❌ {package} (import failed)")
            failed_imports.append(package)
        except Exception as e:
            print(f"❌ {package} (error: {str(e)})")
            failed_imports.append(package)
    
    # Print summary
    print("\nSummary:")
    print(f"Successfully imported {len(successful_imports)} of {len(packages)} packages.")
    
    if failed_imports:
        print("\nFailed imports:")
        for package in failed_imports:
            print(f"- {package}")
        print("\nPlease check your installation and try again.")
        return False
    else:
        print("\nAll packages imported successfully! Your environment is ready.")
        return True

if __name__ == "__main__":
    success = check_imports()
    sys.exit(0 if success else 1)
