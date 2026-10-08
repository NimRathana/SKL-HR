import os
import uuid
from datetime import datetime
from pathlib import Path

from app.config.settings import settings


def save_upload_file(file, upload_dir: str = "uploads/profile_images") -> str:
    """
    Save uploaded file to disk and return the file path.
    
    Args:
        file: FastAPI UploadFile object
        upload_dir: Directory to save files
    
    Returns:
        str: Relative path to saved file
    """
    # Create directory if it doesn't exist
    base_path = Path(upload_dir)
    base_path.mkdir(parents=True, exist_ok=True)
    
    # Generate unique filename
    file_extension = Path(file.filename).suffix if file.filename else ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = base_path / unique_filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(file.file.read())
    
    # Return relative path
    return str(file_path)


def delete_file(file_path: str) -> bool:
    """
    Delete a file from disk.
    
    Args:
        file_path: Path to file to delete
    
    Returns:
        bool: True if deleted successfully, False otherwise
    """
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
    except Exception:
        pass
    return False


def get_file_url(file_path: str) -> str:
    """
    Convert file path to a static URL.
    """
    if not file_path:
        return None

    normalized = file_path.replace('\\', '/').lstrip('/')
    if normalized.startswith('uploads/'):
        return f"/{normalized}"

    return f"/uploads/{normalized}"
