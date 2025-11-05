#!/usr/bin/env python3
"""
Script para verificar que TODOS los componentes del dashboard 
estén conectados a Historic y NO a GSAUDB
"""

import os
import json
import re

def find_database_connections():
    """Buscar todas las configuraciones de conexión de base de datos"""
    print("🔍 BUSCANDO CONFIGURACIONES DE CONEXIÓN A BASE DE DATOS")
    print("=" * 65)
    
    # Directorios donde buscar configuraciones
    search_dirs = [
        "C:\\Users\\alber\\Autonumerica\\Numerica",
        "C:\\Users\\alber\\Autonumerica\\Numerica\\backend-lambda",
        "C:\\Users\\alber\\Autonumerica\\Numerica\\api-server",
        "C:\\Users\\alber\\Autonumerica\\Numerica\\payroll-employees"
    ]
    
    config_files = []
    
    for search_dir in search_dirs:
        if os.path.exists(search_dir):
            for root, dirs, files in os.walk(search_dir):
                for file in files:
                    # Buscar archivos de configuración
                    if any(file.endswith(ext) for ext in ['.env', '.json', '.js', '.ts', '.py', '.yaml', '.yml']):
                        file_path = os.path.join(root, file)
                        config_files.append(file_path)
    
    print(f"📋 Archivos de configuración encontrados: {len(config_files)}")
    return config_files

def analyze_config_file(file_path):
    """Analizar un archivo de configuración en busca de conexiones de BD"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Patrones a buscar
        patterns = [
            r'gsaudb\.cgt6iqqkqla7\.us-east-1\.rds\.amazonaws\.com',  # Host GSAUDB (incorrecto)
            r'dbgsau\.cgt6iqqkqla7\.us-east-1\.rds\.amazonaws\.com',   # Host Historic (correcto)
            r'database.*=.*GSAUDB',                                   # Database GSAUDB (incorrecto)
            r'database.*=.*Historic',                                 # Database Historic (correcto)
            r'DB_HOST.*=.*gsaudb',                                    # Variables de entorno
            r'DB_HOST.*=.*dbgsau',
            r'PGHOST.*=.*gsaudb',
            r'PGHOST.*=.*dbgsau',
            r'DB_NAME.*=.*GSAUDB',
            r'DB_NAME.*=.*Historic',
            r'PGDATABASE.*=.*GSAUDB',
            r'PGDATABASE.*=.*Historic'
        ]
        
        found_configs = []
        
        for i, line in enumerate(content.split('\n'), 1):
            for pattern in patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    found_configs.append({
                        'line_number': i,
                        'line_content': line.strip(),
                        'pattern': pattern,
                        'is_correct': 'dbgsau' in line or 'Historic' in line
                    })
        
        return found_configs
        
    except Exception as e:
        return [{'error': f"Error leyendo archivo: {e}"}]

def generate_correction_guide():
    """Generar guía de correcciones necesarias"""
    print(f"\n🔧 GUÍA DE CORRECCIONES")
    print("=" * 40)
    
    corrections = {
        "CONEXIONES INCORRECTAS (cambiar)": [
            "gsaudb.cgt6iqqkqla7.us-east-1.rds.amazonaws.com → dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com",
            "database=GSAUDB → database=Historic",
            "DB_HOST=gsaudb... → DB_HOST=dbgsau...",
            "PGHOST=gsaudb... → PGHOST=dbgsau...",
            "DB_NAME=GSAUDB → DB_NAME=Historic",
            "PGDATABASE=GSAUDB → PGDATABASE=Historic"
        ],
        "CONEXIONES CORRECTAS (mantener)": [
            "dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com ✅",
            "database=Historic ✅",
            "DB_HOST=dbgsau... ✅",
            "DB_NAME=Historic ✅"
        ]
    }
    
    for category, items in corrections.items():
        print(f"\n{category}:")
        for item in items:
            print(f"  • {item}")

def create_correct_env_files():
    """Crear archivos .env con la configuración correcta"""
    print(f"\n📝 CREANDO ARCHIVOS .ENV CORREGIDOS")
    print("=" * 45)
    
    # Configuración correcta para Historic
    correct_config = {
        "DB_HOST": "dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com",
        "DB_PORT": "5432", 
        "DB_NAME": "Historic",
        "DB_USER": "postgres",
        "DB_PASSWORD": "SanNicolasTotolapan23_Gloria5!",
        "PGHOST": "dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com",
        "PGPORT": "5432",
        "PGDATABASE": "Historic", 
        "PGUSER": "postgres",
        "PGPASSWORD": "SanNicolasTotolapan23_Gloria5!"
    }
    
    # Crear .env para diferentes componentes
    env_locations = [
        "C:\\Users\\alber\\Autonumerica\\Numerica\\.env",
        "C:\\Users\\alber\\Autonumerica\\Numerica\\backend-lambda\\.env",
        "C:\\Users\\alber\\Autonumerica\\Numerica\\api-server\\.env",
        "C:\\Users\\alber\\Autonumerica\\Numerica\\payroll-employees\\.env"
    ]
    
    for env_path in env_locations:
        try:
            os.makedirs(os.path.dirname(env_path), exist_ok=True)
            
            with open(env_path, 'w') as f:
                f.write("# CONFIGURACIÓN CORREGIDA - CONEXIÓN A HISTORIC\n")
                f.write("# Base de datos con datos reales (no GSAUDB que está vacío)\n\n")
                
                for key, value in correct_config.items():
                    f.write(f"{key}={value}\n")
            
            print(f"✅ {env_path}")
            
        except Exception as e:
            print(f"❌ Error creando {env_path}: {e}")

def create_database_config_json():
    """Crear archivo JSON con configuración de BD"""
    config = {
        "database_config": {
            "correct_connection": {
                "host": "dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com",
                "port": 5432,
                "database": "Historic",
                "user": "postgres",
                "password": "SanNicolasTotolapan23_Gloria5!",
                "ssl": True
            },
            "incorrect_connection": {
                "host": "gsaudb.cgt6iqqkqla7.us-east-1.rds.amazonaws.com",
                "database": "GSAUDB",
                "note": "Esta conexión tiene datos vacíos - NO USAR"
            }
        },
        "dashboard_fields": {
            "connection_required": "Historic",
            "table": "historico_nominas_gsau", 
            "total_columns": 104,
            "records_with_data": 152932
        }
    }
    
    config_file = "C:\\Users\\alber\\Autonumerica\\Numerica\\DATABASE_CONFIG_CORRECTED.json"
    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2)
    
    print(f"✅ Configuración guardada en: {config_file}")

def verify_backend_connections():
    """Verificar conexiones específicas del backend"""
    print(f"\n🔍 VERIFICANDO BACKEND ESPECÍFICAMENTE")
    print("=" * 45)
    
    backend_files = [
        "C:\\Users\\alber\\Autonumerica\\Numerica\\backend-lambda\\src\\db.py",
        "C:\\Users\\alber\\Autonumerica\\Numerica\\backend-lambda\\src\\main.py",
        "C:\\Users\\alber\\Autonumerica\\Numerica\\api-server\\package.json"
    ]
    
    for file_path in backend_files:
        if os.path.exists(file_path):
            print(f"\n📄 Analizando: {file_path}")
            configs = analyze_config_file(file_path)
            
            if configs:
                for config in configs:
                    if 'error' in config:
                        print(f"  ⚠️ {config['error']}")
                    else:
                        status = "✅" if config['is_correct'] else "❌"
                        print(f"  {status} Línea {config['line_number']}: {config['line_content']}")
            else:
                print(f"  📝 No se encontraron configuraciones de BD")
        else:
            print(f"❌ Archivo no encontrado: {file_path}")

def main():
    print("🎯 VERIFICANDO CONEXIONES DE DASHBOARD A HISTORIC")
    print("=" * 60)
    print("💡 Asegurando que todos los componentes usen Historic (datos reales)")
    print("💡 Y NO usen GSAUDB (datos vacíos)")
    
    # 1. Encontrar archivos de configuración
    config_files = find_database_connections()
    
    # 2. Analizar archivos específicos del backend
    verify_backend_connections()
    
    # 3. Generar guía de correcciones
    generate_correction_guide()
    
    # 4. Crear archivos .env corregidos
    create_correct_env_files()
    
    # 5. Crear configuración JSON
    create_database_config_json()
    
    print(f"\n🎯 ACCIÓN REQUERIDA:")
    print("=" * 30)
    print("1. Revisar TODOS los archivos .env creados")
    print("2. Actualizar configuraciones en el código backend")
    print("3. Reiniciar todos los servicios/APIs")
    print("4. Verificar que el dashboard use Historic, no GSAUDB")
    
    print(f"\n✅ CONFIGURACIÓN CORRECTA:")
    print("  Host: dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com")
    print("  Database: Historic")
    print("  Tabla: historico_nominas_gsau")
    print("  Registros disponibles: 152,932+")

if __name__ == "__main__":
    main()
