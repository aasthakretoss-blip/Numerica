import psycopg2

try:
    # First, try to connect to the default postgres database to list all databases
    conn = psycopg2.connect(
        host='dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com',
        port=5432,
        database='postgres',
        user='postgres',
        password='SanNicolasTotolapan23_Gloria5!'
    )
    cur = conn.cursor()
    
    print('Searching for historico_nominas_gsau...')
    print('=' * 50)
    
    # Check if it's a database
    cur.execute("""
        SELECT datname 
        FROM pg_database 
        WHERE datname LIKE '%historico%' OR datname LIKE '%nomina%'
        ORDER BY datname;
    """)
    
    databases = cur.fetchall()
    if databases:
        print('Found databases with historico or nomina:')
        for db in databases:
            print(f'  - {db[0]}')
    else:
        print('No databases found with historico or nomina in the name.')
    
    # Check if it's a table in current database
    cur.execute("""
        SELECT table_schema, table_name 
        FROM information_schema.tables 
        WHERE table_name LIKE '%historico%' OR table_name LIKE '%nomina%'
        ORDER BY table_schema, table_name;
    """)
    
    tables = cur.fetchall()
    if tables:
        print('\nFound tables with historico or nomina:')
        for schema, table in tables:
            print(f'  - {schema}.{table}')
    else:
        print('\nNo tables found with historico or nomina in the name.')
    
    # List all available databases
    cur.execute("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;")
    all_databases = cur.fetchall()
    print(f'\nAll available databases:')
    for db in all_databases:
        print(f'  - {db[0]}')
    
    cur.close()
    conn.close()
    
    # Now try to connect specifically to historico_nominas_gsau if it exists
    print(f'\nTrying to connect to historico_nominas_gsau database...')
    try:
        conn2 = psycopg2.connect(
            host='dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com',
            port=5432,
            database='historico_nominas_gsau',
            user='postgres',
            password='SanNicolasTotolapan23_Gloria5!'
        )
        cur2 = conn2.cursor()
        
        # Get all tables in this database
        cur2.execute("""
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_type = 'BASE TABLE' 
            AND table_schema NOT IN ('information_schema', 'pg_catalog')
            ORDER BY table_schema, table_name;
        """)
        
        tables = cur2.fetchall()
        print(f'Tables in historico_nominas_gsau database:')
        total_records = 0
        
        if tables:
            for schema, table in tables:
                table_with_schema = f'"{schema}"."{table}"'
                count_query = f'SELECT COUNT(*) FROM {table_with_schema}'
                try:
                    cur2.execute(count_query)
                    count = cur2.fetchone()[0]
                    total_records += count
                    print(f'  - {schema}.{table}: {count:,} records')
                except Exception as e:
                    print(f'  - {schema}.{table}: Error counting records - {e}')
        else:
            print('  No user tables found.')
        
        print(f'\nTotal records in historico_nominas_gsau: {total_records:,}')
        cur2.close()
        conn2.close()
        
    except Exception as e:
        print(f'Could not connect to historico_nominas_gsau database: {e}')
    
except Exception as e:
    print(f'Error connecting to database: {e}')
