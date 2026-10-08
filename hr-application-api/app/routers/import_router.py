from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.controllers import import_controller
from app.dependencies.auth import get_db, verify_access_token
from app.schemas.import_schema import WorkbookImportRequest

router = APIRouter(prefix='/imports', tags=['imports'])


@router.post('/workbook')
def import_workbook(
    payload: WorkbookImportRequest,
    db: Session = Depends(get_db),
    auth_user_id: UUID = Depends(verify_access_token),
):
    return import_controller.import_workbook(payload, auth_user_id, db)