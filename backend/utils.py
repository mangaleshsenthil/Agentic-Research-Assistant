import os
import shutil
from datetime import datetime

def create_temp_dir(dir_name: str = "temp_uploads"):
    """Ensures a directory exists for temporary file storage."""
    if not os.path.exists(dir_name):
        os.makedirs(dir_name)
    return dir_name

def cleanup_files(dir_name: str):
    """Removes temporary files to save space."""
    if os.path.exists(dir_name):
        shutil.rmtree(dir_name)

def log_event(message: str):
    """Simple timestamped logger for your orchestrator's decisions."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}")