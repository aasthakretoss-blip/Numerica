from pydantic import BaseModel
from typing import List, Optional

class Employee(BaseModel):
    id: str
    firstName: str
    lastName: str
    fullName: str
    email: str
    phone: Optional[str] = None
    department: str
    role: str
    location: Optional[str] = None
    status: str
    hireDate: Optional[str] = None
    tags: Optional[List[str]] = None
    avatarUrl: Optional[str] = None

class PaginatedEmployees(BaseModel):
    data: List[Employee]
    page: int
    pageSize: int
    total: int

