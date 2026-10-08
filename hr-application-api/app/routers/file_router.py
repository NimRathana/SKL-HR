from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse as DownloadResponse
from sqlalchemy.orm import Session

from app.controllers import file_controller
from app.dependencies.auth import get_db, verify_access_token
from app.schemas.file_schema import FileResponse

router = APIRouter(prefix="/files", tags=["files"])


@router.get("", response_model=list[FileResponse])
def get_files(db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    return file_controller.list_files(auth_user_id, db)


@router.get("/{file_id}/download")
def download_file(file_id: UUID, db: Session = Depends(get_db), auth_user_id: UUID = Depends(verify_access_token)):
    file, path = file_controller.get_file(file_id, auth_user_id, db)
    return DownloadResponse(path=str(path), filename=file.file_name, media_type=file.file_type or "application/octet-stream")
