import psycopg2

try:
    conn = psycopg2.connect(
        host='dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com',
        port=5432,
        database='postgres',
        user='postgres',
        password='SanNicolasTotolapan23_Gloria5!'
    )
    cur = conn.cursor()
    
    # Get all user tables
    cur.execute("""
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_type = 'BASE TABLE' 
        AND table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY table_schema, table_name;
    """)
    
    tables = cur.fetchall()
    print('Available tables:')
    print('=' * 50)
    
    if tables:
        for schema, table in tables:
            print(f'{schema}.{table}')
    else:
        print('No user tables found.')
    
    # Also check specifically for the payroll database mentioned in rules
    cur.execute("""
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_name LIKE '%nomina%' OR table_name LIKE '%payroll%'
        ORDER BY table_schema, table_name;
    """)
    
    payroll_tables = cur.fetchall()
    if payroll_tables:
        print('\nPayroll-related tables:')
        print('=' * 30)
        for schema, table in payroll_tables:
            print(f'{schema}.{table}')
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f'Error connecting to database: {e}')
