from fastapi import FastAPI, Depends, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from .models import Employee, PaginatedEmployees
from .auth import verify_jwt
from .db import get_conn
from mangum import Mangum
import os

app = FastAPI(title='Payroll Employees API')

ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:5173').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

async def auth_dep(authorization: Optional[str] = Header(None)):
    try:
        claims, groups = verify_jwt(authorization or '')
        return { 'claims': claims, 'groups': groups }
    except Exception as e:
        raise HTTPException(status_code=401, detail='Unauthorized') from e

SORTABLE = { 'fullName': 'lower(first_name || \" \" || last_name)', 'department': 'department', 'role': 'role', 'status': 'status', 'hireDate': 'hire_date' }

def sanitize_sort(sort_by: str, sort_dir: str) -> tuple[str, str]:
    col = SORTABLE.get(sort_by, 'lower(first_name || \" \" || last_name)')
    dir = 'ASC' if sort_dir.lower() != 'desc' else 'DESC'
    return col, dir

@app.get('/api/employees', response_model=PaginatedEmployees)
async def list_employees(
    q: Optional[str] = None,
    department: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    location: Optional[str] = None,
    sortBy: str = 'fullName',
    sortDir: str = 'asc',
    page: int = 1,
    pageSize: int = 20,
    ctx = Depends(auth_dep)
):
    groups = ctx['groups']
    # viewer or above can read
    if not any(g in groups for g in ['viewer','manager','hr','admin']):
        raise HTTPException(status_code=403, detail='Forbidden')

    where = []
    params = []
    if q:
        where.append('(lower(first_name) LIKE %s OR lower(last_name) LIKE %s OR lower(email) LIKE %s)')
        like = f"%{q.lower()}%"; params.extend([like, like, like])
    if department:
        where.append('department = %s'); params.append(department)
    if role:
        where.append('role = %s'); params.append(role)
    if status:
        where.append('status = %s'); params.append(status)
    if location:
        where.append('location = %s'); params.append(location)

    where_sql = ('WHERE ' + ' AND '.join(where)) if where else ''
    col, dir = sanitize_sort(sortBy, sortDir)
    off = max(0, (page - 1) * pageSize)
    lim = min(200, max(1, pageSize))

    sql = f"""
      SELECT id, first_name, last_name, email, phone, department, role, location, status, hire_date, tags, avatar_url,
             (first_name || ' ' || last_name) as full_name
      FROM employees
      {where_sql}
      ORDER BY {col} {dir}
      OFFSET %s LIMIT %s
    """
    sql_count = f"SELECT count(*) FROM employees {where_sql}"

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql_count, params)
            total = cur.fetchone()[0]
            cur.execute(sql, params + [off, lim])
            rows = cur.fetchall()

    def row_to_emp(r):
        return Employee(
            id=str(r[0]), firstName=r[1], lastName=r[2], email=r[3], phone=r[4],
            department=r[5], role=r[6], location=r[7], status=r[8], hireDate=r[9].isoformat() if r[9] else None,
            tags=r[10], avatarUrl=r[11], fullName=r[12]
        )

    data = [row_to_emp(r) for r in rows]
    return { 'data': data, 'page': page, 'pageSize': lim, 'total': total }

@app.get('/api/employees/{emp_id}', response_model=Employee)
async def get_employee(emp_id: str, ctx = Depends(auth_dep)):
    groups = ctx['groups']
    if not any(g in groups for g in ['viewer','manager','hr','admin']):
        raise HTTPException(status_code=403, detail='Forbidden')
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
              SELECT id, first_name, last_name, email, phone, department, role, location, status, hire_date, tags, avatar_url,
                     (first_name || ' ' || last_name) as full_name
              FROM employees WHERE id = %s
            """, [emp_id])
            r = cur.fetchone()
            if not r:
                raise HTTPException(status_code=404, detail='Not found')
    return Employee(
        id=str(r[0]), firstName=r[1], lastName=r[2], email=r[3], phone=r[4],
        department=r[5], role=r[6], location=r[7], status=r[8], hireDate=r[9].isoformat() if r[9] else None,
        tags=r[10], avatarUrl=r[11], fullName=r[12]
    )

# Handler moved to handler.py

