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
    
    print('Examining table structures...')
    print('=' * 80)
    
    # Examine historico_nominas_gsau structure
    print('\nTABLE: historico_nominas_gsau')
    print('=' * 50)
    cur.execute("""
        SELECT column_name, data_type, character_maximum_length, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'historico_nominas_gsau'
        ORDER BY ordinal_position;
    """)
    
    nominas_columns = cur.fetchall()
    if nominas_columns:
        print(f"{'Column Name':<30} {'Data Type':<20} {'Max Length':<12} {'Nullable'}")
        print('-' * 75)
        for col_name, data_type, max_length, nullable in nominas_columns:
            max_len_str = str(max_length) if max_length else 'N/A'
            print(f"{col_name:<30} {data_type:<20} {max_len_str:<12} {nullable}")
    else:
        print("No columns found for historico_nominas_gsau")
    
    # Get sample data from historico_nominas_gsau
    print(f"\nSample data from historico_nominas_gsau (first 3 rows):")
    print('-' * 80)
    cur.execute("SELECT * FROM historico_nominas_gsau LIMIT 3")
    sample_nominas = cur.fetchall()
    
    if sample_nominas and nominas_columns:
        # Print column headers
        headers = [col[0] for col in nominas_columns]
        for i, header in enumerate(headers):
            print(f"{header:<20}", end=" ")
        print()
        print("-" * (21 * len(headers)))
        
        # Print sample data
        for row in sample_nominas:
            for value in row:
                str_value = str(value)[:19] if value is not None else "None"
                print(f"{str_value:<20}", end=" ")
            print()
    
    # Examine historico_fondos_gsau structure
    print('\n\nTABLE: historico_fondos_gsau')
    print('=' * 50)
    cur.execute("""
        SELECT column_name, data_type, character_maximum_length, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'historico_fondos_gsau'
        ORDER BY ordinal_position;
    """)
    
    fondos_columns = cur.fetchall()
    if fondos_columns:
        print(f"{'Column Name':<30} {'Data Type':<20} {'Max Length':<12} {'Nullable'}")
        print('-' * 75)
        for col_name, data_type, max_length, nullable in fondos_columns:
            max_len_str = str(max_length) if max_length else 'N/A'
            print(f"{col_name:<30} {data_type:<20} {max_len_str:<12} {nullable}")
    else:
        print("No columns found for historico_fondos_gsau")
    
    # Get sample data from historico_fondos_gsau (if any)
    print(f"\nSample data from historico_fondos_gsau:")
    print('-' * 80)
    cur.execute("SELECT * FROM historico_fondos_gsau LIMIT 3")
    sample_fondos = cur.fetchall()
    
    if sample_fondos and fondos_columns:
        # Print column headers
        headers = [col[0] for col in fondos_columns]
        for i, header in enumerate(headers):
            print(f"{header:<20}", end=" ")
        print()
        print("-" * (21 * len(headers)))
        
        # Print sample data
        for row in sample_fondos:
            for value in row:
                str_value = str(value)[:19] if value is not None else "None"
                print(f"{str_value:<20}", end=" ")
            print()
    else:
        print("No sample data available (table is empty)")
    
    cur.close()
    conn.close()
    
except Exception as e:
    print(f'Error connecting to database: {e}')
