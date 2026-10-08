from enum import Enum


class SalaryType(str, Enum):
    MONTHLY = "monthly"
    DAILY = "daily"
    HOURLY = "hourly"
    ANNUAL = "annual"