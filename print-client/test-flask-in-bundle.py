#!/usr/bin/env python3
"""
Test script to verify Flask can run in the packaged environment.
This script should be placed in the app.asar.unpacked directory.
"""

import sys
import os
import subprocess
import time

def test_flask_startup():
    """Test if Flask can start up properly"""
    print("Testing Flask startup in packaged environment...")
    print(f"Python executable: {sys.executable}")
    print(f"Python version: {sys.version}")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Script directory: {os.path.dirname(os.path.abspath(__file__))}")
    
    # List files in current directory
    print("\nFiles in current directory:")
    for file in os.listdir('.'):
        print(f"  {file}")
    
    # Check if Flask script exists
    flask_script = 'print_dashboard_insepctionapp.py'
    if os.path.exists(flask_script):
        print(f"\n✅ Flask script found: {flask_script}")
    else:
        print(f"\n❌ Flask script not found: {flask_script}")
        return False
    
    # Try to import Flask
    try:
        import flask
        print(f"✅ Flask imported successfully: {flask.__version__}")
    except ImportError as e:
        print(f"❌ Failed to import Flask: {e}")
        return False
    
    # Try to start Flask server
    try:
        print("\n🔄 Starting Flask server...")
        process = subprocess.Popen(
            [sys.executable, flask_script],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        # Wait a bit for startup
        time.sleep(5)
        
        # Check if process is still running
        if process.poll() is None:
            print("✅ Flask process is still running")
            
            # Try to connect to the server
            try:
                import requests
                response = requests.get('http://localhost:7010', timeout=5)
                print(f"✅ Flask server responded: {response.status_code}")
                process.terminate()
                return True
            except Exception as e:
                print(f"❌ Could not connect to Flask server: {e}")
                process.terminate()
                return False
        else:
            stdout, stderr = process.communicate()
            print(f"❌ Flask process exited with code {process.returncode}")
            print(f"STDOUT: {stdout}")
            print(f"STDERR: {stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Failed to start Flask server: {e}")
        return False

if __name__ == '__main__':
    success = test_flask_startup()
    if success:
        print("\n🎉 Flask test passed!")
        sys.exit(0)
    else:
        print("\n💥 Flask test failed!")
        sys.exit(1) 