from datetime import datetime

from pydantic import BaseModel


class NotificationItem(BaseModel):
    id: str
    type: str
    category: str = "billing"
    message: str
    is_read: bool
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: list[NotificationItem]
    total: int
    unread_count: int
    page: int
    page_size: int


class MarkNotificationReadResponse(BaseModel):
    id: str
    is_read: bool


class MarkAllReadResponse(BaseModel):
    updated: int
