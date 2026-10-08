from enum import Enum


class SubscriptionStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"