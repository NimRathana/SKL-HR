from datetime import date
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.controllers.access import authorized_user, require_active_company, require_management_user
from app.enums.gender import Gender
from app.models.company import Company
from app.models.employee import Employee
from app.models.position import Position
from app.schemas.import_schema import WorkbookImportRequest
from app.services.plan_entitlements import enforce_resource_capacity, require_plan_feature


def import_workbook(payload: WorkbookImportRequest, auth_user_id: UUID, db: Session) -> dict:
    try:
        user = require_management_user(authorized_user(auth_user_id, db))
        if user.tenant_id is None:
            raise HTTPException(status_code=400, detail='A tenant is required before importing data')

        tenant_id = user.tenant_id
        require_plan_feature(tenant_id, "employee_management", db)
        companies = db.query(Company).filter(Company.tenant_id == tenant_id).all()
        companies_by_code = _index_companies(companies)
        companies_by_name = _index_company_names(companies)
        inserted = {'companies': 0, 'positions': 0, 'employees': 0}
        updated = {'companies': 0, 'positions': 0, 'employees': 0}
        skipped = {'companies': 0, 'positions': 0, 'employees': 0}

        _import_companies(
            payload.companies, tenant_id, db, companies_by_code, companies_by_name, inserted, updated, skipped,
        )
        positions = (
            db.query(Position)
            .join(Company, Position.company_id == Company.id)
            .filter(Company.tenant_id == tenant_id)
            .all()
        )
        position_index = _index_positions(positions)
        _import_positions(
            payload.positions, db, companies_by_name, position_index, inserted, skipped,
        )
        employees = db.query(Employee).filter(Employee.tenant_id == tenant_id).all()
        employee_index = _index_employees(employees)
        _import_employees(
            payload.employees, tenant_id, db, companies_by_name, position_index,
            employee_index, inserted, updated, skipped,
        )

        db.commit()
        return {'inserted': inserted, 'updated': updated, 'skipped': skipped}
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Import could not be saved because a record conflicts with existing data. No records were changed.',
        ) from error
    except Exception:
        db.rollback()
        raise


def _import_companies(rows, tenant_id, db, by_code, by_name, inserted, updated, skipped) -> None:
    pending = list(enumerate(rows, start=2))
    while pending:
        remaining = []
        progress = False
        for row_number, row in pending:
            name = _required(row, 'Company name', 'Companies', row_number)
            code = _required(row, 'Company code', 'Companies', row_number)
            code_key = _key(code)
            existing = by_code.get(code_key, [])
            if len(existing) > 1:
                _fail('Companies', row_number, f"company code '{code}' matches more than one existing company")
            has_parent_field = 'Parent company' in row
            parent_name = _value(row, 'Parent company')
            parent = _find_company(parent_name, by_name) if parent_name else None
            if has_parent_field and parent_name and parent is None:
                remaining.append((row_number, row))
                continue

            if existing:
                company = existing[0]
                changed = False
                if company.name != name:
                    company.name = name
                    changed = True
                for field, column in (('email', 'Email'), ('phone', 'Phone')):
                    if column in row:
                        value = _value(row, column) or None
                        if getattr(company, field) != value:
                            setattr(company, field, value)
                            changed = True
                if has_parent_field:
                    if parent is not None:
                        if parent.id == company.id:
                            _fail('Companies', row_number, 'a company cannot be its own parent')
                        if _is_descendant(parent.id, company.id, db):
                            _fail('Companies', row_number, 'a company cannot be assigned under its descendant')
                    parent_id = parent.id if parent else None
                    if company.parent_id != parent_id:
                        company.parent_id = parent_id
                        changed = True
                _add_company_name(by_name, name, company)
                if changed:
                    updated['companies'] += 1
                else:
                    skipped['companies'] += 1
                progress = True
                continue

            company = Company(
                tenant_id=tenant_id,
                parent_id=parent.id if parent else None,
                name=name,
                code=code,
                address=_value(row, 'Address') or None,
                email=_value(row, 'Email') or None,
                phone=_value(row, 'Phone') or None,
                website=_value(row, 'Website') or None,
                description=_value(row, 'Description') or None,
            )
            enforce_resource_capacity(tenant_id, "companies", db)
            db.add(company)
            db.flush()
            by_code.setdefault(code_key, []).append(company)
            _add_company_name(by_name, name, company)
            inserted['companies'] += 1
            progress = True

        if not progress:
            row_number, row = remaining[0]
            _fail('Companies', row_number, f"parent company '{_value(row, 'Parent company')}' was not found")
        pending = remaining


def _is_descendant(company_id, ancestor_id, db) -> bool:
    current = db.query(Company).filter(Company.id == company_id).first()
    visited = set()
    while current is not None and current.parent_id is not None:
        if current.id in visited:
            return True
        visited.add(current.id)
        if current.parent_id == ancestor_id:
            return True
        current = db.query(Company).filter(Company.id == current.parent_id).first()
    return False


def _import_positions(rows, db, companies_by_name, position_index, inserted, skipped) -> None:
    for row_number, row in enumerate(rows, start=2):
        company_name = _required(row, 'Company', 'Positions', row_number)
        company = _find_company(company_name, companies_by_name)
        if company is None:
            _fail('Positions', row_number, f"company '{company_name}' was not found. Import Companies first")
        code = _required(row, 'Code', 'Positions', row_number)
        title = _required(row, 'Title', 'Positions', row_number)
        index_key = (company.id, _key(code))
        existing = position_index['by_code'].get(index_key)
        if existing:
            position_index['by_title'].setdefault((company.id, _key(title)), []).append(existing)
            skipped['positions'] += 1
            continue

        require_active_company(company)
        position = Position(
            company_id=company.id,
            code=code,
            title=title,
            description=_value(row, 'Description') or None,
        )
        db.add(position)
        db.flush()
        position_index['by_code'][index_key] = position
        position_index['by_title'].setdefault((company.id, _key(title)), []).append(position)
        inserted['positions'] += 1


def _import_employees(rows, tenant_id, db, companies_by_name, position_index, employee_index, inserted, updated, skipped) -> None:
    for row_number, row in enumerate(rows, start=2):
        company_name = _required(row, 'Company', 'Employees', row_number)
        company = _find_company(company_name, companies_by_name)
        if company is None:
            _fail('Employees', row_number, f"company '{company_name}' was not found. Import Companies first")
        position_title = _required(row, 'Position', 'Employees', row_number)
        matching_positions = position_index['by_title'].get((company.id, _key(position_title)), [])
        if not matching_positions:
            _fail('Employees', row_number, f"position '{position_title}' was not found for company '{company.name}'. Import Positions first")
        if len({position.id for position in matching_positions}) > 1:
            _fail('Employees', row_number, f"position '{position_title}' is ambiguous for company '{company.name}'")
        position = matching_positions[0]

        first_name = _required(row, 'First name', 'Employees', row_number)
        last_name = _required(row, 'Last name', 'Employees', row_number)
        hire_date = _parse_date(_required(row, 'Hire date', 'Employees', row_number), 'Hire date', row_number)
        date_of_birth = _parse_date(_value(row, 'Date of birth'), 'Date of birth', row_number, optional=True)
        email = _value(row, 'Email').lower() or None
        employee_key = _employee_key(company.id, position.id, first_name, last_name, hire_date)
        gender_value = _key(_required(row, 'Gender', 'Employees', row_number))
        try:
            gender = Gender(gender_value)
        except ValueError:
            _fail('Employees', row_number, f"gender '{gender_value}' must be male, female, or other")

        if employee_key in employee_index:
            employee = employee_index[employee_key]
            changed = False
            if employee.gender != gender:
                employee.gender = gender
                changed = True
            if email is not None and employee.email != email:
                employee.email = email
                changed = True
            if changed:
                updated['employees'] += 1
            else:
                skipped['employees'] += 1
            continue

        require_active_company(company)
        enforce_resource_capacity(tenant_id, "employees", db)
        employee = Employee(
            tenant_id=tenant_id,
            company_id=company.id,
            position_id=position.id,
            first_name=first_name,
            last_name=last_name,
            gender=gender,
            date_of_birth=date_of_birth,
            phone=_value(row, 'Phone') or None,
            email=email,
            address=_value(row, 'Address') or None,
            hire_date=hire_date,
        )
        db.add(employee)
        db.flush()
        employee_index[employee_key] = employee
        inserted['employees'] += 1


def _index_companies(companies):
    index = {}
    for company in companies:
        index.setdefault(_key(company.code), []).append(company)
    return index


def _index_company_names(companies):
    index = {}
    for company in companies:
        _add_company_name(index, company.name, company)
        _add_company_name(index, company.code, company)
    return index


def _add_company_name(index, name, company) -> None:
    matches = index.setdefault(_key(name), [])
    if all(item.id != company.id for item in matches):
        matches.append(company)


def _find_company(name, by_name):
    matches = by_name.get(_key(name), [])
    return matches[0] if len(matches) == 1 else None


def _index_positions(positions):
    by_code = {}
    by_title = {}
    for position in positions:
        by_code[(position.company_id, _key(position.code))] = position
        by_title.setdefault((position.company_id, _key(position.title)), []).append(position)
    return {'by_code': by_code, 'by_title': by_title}


def _index_employees(employees):
    return {
        _employee_key(employee.company_id, employee.position_id, employee.first_name,
                      employee.last_name, employee.hire_date): employee
        for employee in employees
    }


def _employee_key(company_id, position_id, first_name, last_name, hire_date):
    return company_id, position_id, _key(first_name), _key(last_name), hire_date


def _value(row, label) -> str:
    value = row.get(label, '')
    return str(value).strip() if value is not None else ''


def _required(row, label, sheet, row_number) -> str:
    value = _value(row, label)
    if not value:
        _fail(sheet, row_number, f"'{label}' is required")
    return value


def _key(value) -> str:
    return str(value or '').strip().casefold()


def _parse_date(value, label, row_number, optional=False):
    if not value and optional:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        _fail('Employees', row_number, f"'{label}' must be a valid date in YYYY-MM-DD format")


def _fail(sheet, row_number, message) -> None:
    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=f'{sheet} row {row_number}: {message}',
    )