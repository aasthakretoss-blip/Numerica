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
    print('Number of datapoints in each table:')
    print('=' * 50)
    
    if tables:
        for schema, table in tables:
            table_with_schema = f'"{schema}"."{table}"'
            count_query = f'SELECT COUNT(*) FROM {table_with_schema}'
            try:
                cur.execute(count_query)
                count = cur.fetchone()[0]
                print(f'{schema}.{table}: {count:,} records')
            except Exception as e:
                print(f'{schema}.{table}: Error counting records - {e}')
    else:
        print('No user tables found.')
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f'Error connecting to database: {e}')
