from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.controllers.access import authorized_user, require_management_user
from app.models.system_parameter import SystemParameter


def get_system_parameters(auth_user_id: UUID, db: Session) -> list[SystemParameter]:
    authorized_user(auth_user_id, db)
    return (
        db.query(SystemParameter)
        .order_by(SystemParameter.category.asc(), SystemParameter.name.asc())
        .all()
    )


def update_system_parameter(
    parameter_id: UUID,
    value: str,
    auth_user_id: UUID,
    db: Session,
) -> SystemParameter:
    current_user = authorized_user(auth_user_id, db)
    require_management_user(current_user)

    parameter = db.query(SystemParameter).filter(SystemParameter.id == parameter_id).first()
    if parameter is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="System parameter not found",
        )

    if parameter.type == "Number" and value and not value.isdigit():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Number parameters must contain only digits",
        )

    if parameter.type == "Boolean" and value not in ("True", "False"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Boolean parameters must be True or False",
        )

    parameter.value = value
    db.commit()
    db.refresh(parameter)
    return parameter