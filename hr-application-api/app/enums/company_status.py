from enum import Enum


class CompanyStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"