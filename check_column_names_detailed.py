import psycopg2
import binascii

# Configuración de conexión
config = {
    'host': 'gsaudb.cgt6iqqkqla7.us-east-1.rds.amazonaws.com',
    'database': 'Historic',
    'user': 'postgres',
    'password': 'SanNicolasTotolapan23_Gloria5!',
    'port': 5432
}

try:
    # Conectar a la base de datos
    conn = psycopg2.connect(**config)
    cursor = conn.cursor()
    
    print("🔍 Obteniendo nombres exactos de columnas...")
    
    # Obtener información detallada de las columnas
    cursor.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'historico_nominas_gsau'
        AND (column_name LIKE '%SUELDO%' OR column_name LIKE '%COMISION%' OR column_name LIKE '%PERCEPCION%')
        ORDER BY ordinal_position
    """)
    
    columns = cursor.fetchall()
    
    print(f"\n📋 Columnas relacionadas con dinero encontradas:")
    print("-" * 80)
    
    for col_name, data_type in columns:
        print(f"Nombre: '{col_name}'")
        print(f"Tipo: {data_type}")
        
        # Mostrar representación hexadecimal para ver espacios exactos
        hex_repr = binascii.hexlify(col_name.encode('utf-8')).decode('utf-8')
        print(f"Hex: {hex_repr}")
        
        # Mostrar longitud y caracteres de inicio/fin
        print(f"Longitud: {len(col_name)}")
        if len(col_name) > 0:
            print(f"Primer char: '{col_name[0]}' (ASCII: {ord(col_name[0])})")
            print(f"Último char: '{col_name[-1]}' (ASCII: {ord(col_name[-1])})")
        print("-" * 40)
    
    # También obtener el período más reciente para verificar
    cursor.execute("SELECT cveper FROM historico_nominas_gsau WHERE cveper IS NOT NULL ORDER BY cveper DESC LIMIT 1")
    latest_period = cursor.fetchone()
    if latest_period:
        print(f"\n📅 Período más reciente: {latest_period[0]}")
    
    cursor.close()
    conn.close()
    
    print("\n✅ Consulta completada exitosamente")
    
except Exception as e:
    print(f"❌ Error: {e}")
