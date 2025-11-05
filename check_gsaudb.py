import psycopg2

try:
    # Connect to Historic database
    conn = psycopg2.connect(
        host='dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com',
        port=5432,
        database='Historic',
        user='postgres',
        password='SanNicolasTotolapan23_Gloria5!'
    )
    cur = conn.cursor()
    
    print('Checking Historic database...')
    print('=' * 50)
    
    # Get all tables in Historic
    cur.execute("""
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_type = 'BASE TABLE' 
        AND table_schema NOT IN ('information_schema', 'pg_catalog')
        ORDER BY table_schema, table_name;
    """)
    
    tables = cur.fetchall()
    print(f'Tables in Historic database:')
    total_records = 0
    
    if tables:
        for schema, table in tables:
            table_with_schema = f'"{schema}"."{table}"'
            count_query = f'SELECT COUNT(*) FROM {table_with_schema}'
            try:
                cur.execute(count_query)
                count = cur.fetchone()[0]
                total_records += count
                print(f'  - {schema}.{table}: {count:,} records')
            except Exception as e:
                print(f'  - {schema}.{table}: Error counting records - {e}')
    else:
        print('  No user tables found.')
    
    print(f'\nTotal records in Historic: {total_records:,}')
    
    # Also search specifically for tables with nomina or payroll related names
    cur.execute("""
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE (table_name LIKE '%nomina%' OR table_name LIKE '%payroll%' OR table_name LIKE '%historico%')
        AND table_type = 'BASE TABLE'
        ORDER BY table_schema, table_name;
    """)
    
    payroll_tables = cur.fetchall()
    if payroll_tables:
        print(f'\nPayroll/Historical tables found:')
        for schema, table in payroll_tables:
            table_with_schema = f'"{schema}"."{table}"'
            count_query = f'SELECT COUNT(*) FROM {table_with_schema}'
            try:
                cur.execute(count_query)
                count = cur.fetchone()[0]
                print(f'  - {schema}.{table}: {count:,} records')
            except Exception as e:
                print(f'  - {schema}.{table}: Error counting records - {e}')
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f'Error connecting to Historic database: {e}')
