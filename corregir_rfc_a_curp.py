#!/usr/bin/env python3
"""
Script para corregir todos los servicios del backend para usar CURP en lugar de RFC
"""

import os
import re
from datetime import datetime

def backup_file(file_path):
    """Crear respaldo del archivo original"""
    if os.path.exists(file_path):
        backup_path = f"{file_path}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        os.system(f'copy "{file_path}" "{backup_path}"')
        print(f"✅ Respaldo creado: {backup_path}")
        return True
    return False

def fix_nominas_service():
    """Corregir nominasService.js para usar CURP"""
    file_path = "C:\\Users\\alber\\Autonumerica\\Numerica\\api-server\\services\\nominasService.js"
    
    if not os.path.exists(file_path):
        print(f"❌ No encontrado: {file_path}")
        return False
    
    print(f"🔧 Corrigiendo: {file_path}")
    backup_file(file_path)
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Cambios específicos
    fixes = [
        # Cambiar RFC por CURP en SELECT
        (r'"RFC" as rfc,', '"CURP" as curp,'),
        
        # Cambiar RFC por CURP en búsquedas
        (r'"RFC" ILIKE \$\{paramIndex\}', '"CURP" ILIKE ${paramIndex}'),
        
        # Cambiar OR "RFC" ILIKE por OR "CURP" ILIKE
        (r'OR "RFC" ILIKE \$\{paramIndex\}', 'OR "CURP" ILIKE ${paramIndex}'),
        
        # Cambiar comentarios y documentación
        (r'CURP=CURP', 'CURP=CURP'),  # Ya correcto
        (r'RFC=RFC', 'CURP=CURP'),
        
        # Asegurar que los alias sean consistentes
        (r'as rfc', 'as curp'),
    ]
    
    original_content = content
    for pattern, replacement in fixes:
        content = re.sub(pattern, replacement, content)
    
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Correcciones aplicadas a nominasService.js")
        return True
    else:
        print(f"ℹ️  No se necesitaron cambios en nominasService.js")
        return False

def fix_payroll_filter_service():
    """Corregir payrollFilterService.js para consistencia"""
    file_path = "C:\\Users\\alber\\Autonumerica\\Numerica\\api-server\\services\\payrollFilterService.js"
    
    if not os.path.exists(file_path):
        print(f"❌ No encontrado: {file_path}")
        return False
    
    print(f"🔧 Corrigiendo: {file_path}")
    backup_file(file_path)
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Cambios específicos - el alias debe ser curp, no rfc
    fixes = [
        # El campo ya es correcto ("CURP" as curp) pero estaba como ("CURP" as rfc)
        (r'"CURP" as rfc,', '"CURP" as curp,'),
    ]
    
    original_content = content
    for pattern, replacement in fixes:
        content = re.sub(pattern, replacement, content)
    
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Correcciones aplicadas a payrollFilterService.js")
        return True
    else:
        print(f"ℹ️  No se necesitaron cambios en payrollFilterService.js")
        return False

def create_corrected_queries():
    """Crear archivo con queries corregidas usando CURP"""
    queries_content = '''-- QUERIES CORREGIDAS PARA USAR CURP CONSISTENTEMENTE
-- Fecha: {date}
-- Propósito: Reemplazar todas las referencias a RFC por CURP

-- 1. QUERY PRINCIPAL PARA DASHBOARD (usando CURP)
SELECT 
    "CURP" as curp,
    "Nombre completo" as nombre_completo,
    "Mes" as mes,
    " VALES DESPENSA NETO " as vales_despensa_neto,
    " BONO " as bono,
    " AGUINALDO " as aguinaldo,
    " GRATIFICACION " as gratificacion,
    " PRIMA VACACIONAL " as prima_vacacional,
    " COMPENSACION " as compensacion,
    " SEPTIMO DIA " as septimo_dia,
    " HORAS EXTRA DOBLE " as horas_extra_doble,
    " SUBSIDIO AL EMPLEO " as subsidio_al_empleo,
    " SUELDO X DIAS AC VACACIONES " as sueldo_x_dias_vacaciones,
    " VACACIONES FINIQUITO " as vacaciones_finiquito
FROM historico_nominas_gsau
WHERE "CURP" = $1 AND "Mes" = $2;

-- 2. QUERY PARA BÚSQUEDA DE EMPLEADOS (usando CURP)
SELECT 
    "CURP" as curp,
    "Nombre completo" as nombre,
    "Puesto" as puesto,
    "Compañía" as sucursal,
    "Mes" as mes,
    COALESCE(" SUELDO CLIENTE ", 0) as sueldo,
    "Status" as status
FROM historico_nominas_gsau
WHERE ("Nombre completo" ILIKE $1 OR "CURP" ILIKE $1)
ORDER BY "Nombre completo" ASC
LIMIT $2 OFFSET $3;

-- 3. QUERY PARA CONTEO DE EMPLEADOS ÚNICOS (usando CURP)
SELECT COUNT(DISTINCT "CURP") as unique_count
FROM historico_nominas_gsau
WHERE "CURP" IS NOT NULL AND "CURP" != '';

-- 4. QUERY PARA VERIFICAR DATOS DE EMPLEADO ESPECÍFICO (usando CURP)
SELECT *
FROM historico_nominas_gsau 
WHERE "CURP" = $1
ORDER BY cveper DESC;

-- 5. QUERY PARA DASHBOARD CON FILTROS AVANZADOS (usando CURP)
SELECT 
    "CURP" as curp,
    "Nombre completo" as nombre,
    "Puesto" as puesto,
    "Compañía" as sucursal,
    DATE(cveper)::text as periodo,
    " VALES DESPENSA NETO " as vales_despensa,
    " BONO " as bono,
    " AGUINALDO " as aguinaldo,
    " PRIMA VACACIONAL " as prima_vacacional
FROM historico_nominas_gsau
WHERE 1=1
  AND ("Nombre completo" ILIKE $1 OR "CURP" ILIKE $1)
  AND "CURP" IS NOT NULL
ORDER BY "Nombre completo", cveper DESC;

-- NOTAS IMPORTANTES:
-- * Todos los filtros y búsquedas ahora usan CURP en lugar de RFC
-- * El campo RFC sigue existiendo en la base de datos pero no se usa para identificación
-- * CURP es más confiable ya que tiene 3,057 valores únicos vs 3,050 de RFC
-- * Esto asegura que se capturen todos los empleados correctamente
'''.format(date=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    
    with open("C:\\Users\\alber\\Autonumerica\\Numerica\\QUERIES_CORREGIDAS_CURP.sql", 'w', encoding='utf-8') as f:
        f.write(queries_content)
    
    print("✅ Queries corregidas guardadas en: QUERIES_CORREGIDAS_CURP.sql")

def verify_frontend_compatibility():
    """Verificar si el frontend espera 'rfc' o 'curp'"""
    frontend_files = [
        "C:\\Users\\alber\\Autonumerica\\Numerica\\src\\components\\EmployeeTable.tsx",
        "C:\\Users\\alber\\Autonumerica\\Numerica\\src\\components\\EmployeeTable.jsx",
        "C:\\Users\\alber\\Autonumerica\\Numerica\\src\\services\\nominasApi.ts",
        "C:\\Users\\alber\\Autonumerica\\Numerica\\src\\utils\\fieldsMapping.js"
    ]
    
    print(f"\\n🔍 VERIFICANDO COMPATIBILIDAD CON FRONTEND:")
    print("=" * 50)
    
    for file_path in frontend_files:
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Buscar referencias a rfc o curp
                rfc_matches = re.findall(r'\\brfc\\b', content, re.IGNORECASE)
                curp_matches = re.findall(r'\\bcurp\\b', content, re.IGNORECASE)
                
                if rfc_matches or curp_matches:
                    print(f"\\n📄 {os.path.basename(file_path)}:")
                    if rfc_matches:
                        print(f"  🔍 Referencias a 'rfc': {len(rfc_matches)}")
                    if curp_matches:
                        print(f"  🔍 Referencias a 'curp': {len(curp_matches)}")
                        
            except Exception as e:
                print(f"  ❌ Error leyendo {file_path}: {e}")
        else:
            print(f"  ⚠️  No encontrado: {os.path.basename(file_path)}")

def create_testing_script():
    """Crear script para probar las correcciones"""
    test_script = '''#!/usr/bin/env python3
"""
Script para probar que las correcciones de CURP vs RFC funcionan correctamente
"""

import requests
import json

def test_api_with_curp():
    """Probar API con CURP conocido"""
    base_url = "https://numerica-2.onrender.com"
    
    # CURP de prueba que sabemos que tiene datos
    test_curp = "AAAA860220HDFLRN05"  # Antonio de Jesus Alvarez
    
    print("🧪 PROBANDO API CON CURP CORREGIDO")
    print("=" * 40)
    
    # 1. Probar búsqueda por CURP
    try:
        response = requests.get(f"{base_url}/api/payroll", params={
            "search": test_curp,
            "pageSize": 5
        })
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Búsqueda por CURP exitosa:")
            print(f"   📊 Registros encontrados: {len(data.get('data', []))}")
            
            if data.get('data'):
                empleado = data['data'][0]
                print(f"   👤 Primer empleado:")
                print(f"      CURP: {empleado.get('curp', 'N/A')}")
                print(f"      Nombre: {empleado.get('nombre', 'N/A')}")
                print(f"      RFC: {empleado.get('rfc', 'N/A')}")
        else:
            print(f"❌ Error en búsqueda: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error probando búsqueda: {e}")
    
    # 2. Probar endpoint demográfico
    try:
        response = requests.get(f"{base_url}/api/payroll/demographic", params={
            "pageSize": 5
        })
        
        if response.status_code == 200:
            data = response.json()
            print(f"\\n✅ Endpoint demográfico exitoso:")
            print(f"   📊 Registros: {len(data.get('data', []))}")
            print(f"   🔢 Total: {data.get('total', 0)}")
        else:
            print(f"\\n❌ Error en demográfico: {response.status_code}")
            
    except Exception as e:
        print(f"\\n❌ Error probando demográfico: {e}")
    
    # 3. Probar conteo de CURPs únicos
    try:
        response = requests.get(f"{base_url}/api/payroll/demographic/unique-count")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\\n✅ Conteo de CURPs únicos:")
            print(f"   🔢 CURPs únicos: {data.get('uniqueCurpCount', 0)}")
        else:
            print(f"\\n❌ Error en conteo: {response.status_code}")
            
    except Exception as e:
        print(f"\\n❌ Error probando conteo: {e}")

if __name__ == "__main__":
    print("🎯 INICIANDO PRUEBAS POST-CORRECCIÓN")
    print("Asegúrate de que el servidor esté corriendo en https://numerica-2.onrender.com\\n")
    
    test_api_with_curp()
    
    print("\\n🏁 PRUEBAS COMPLETADAS")
'''
    
    with open("C:\\Users\\alber\\Autonumerica\\Numerica\\test_curp_corrections.py", 'w', encoding='utf-8') as f:
        f.write(test_script)
    
    print("✅ Script de pruebas creado: test_curp_corrections.py")

def main():
    print("🎯 CORRECTOR RFC → CURP PARA BACKEND")
    print("=" * 50)
    print("💡 Corrigiendo todos los servicios para usar CURP consistentemente\\n")
    
    # 1. Corregir nominasService
    nominas_fixed = fix_nominas_service()
    
    # 2. Corregir payrollFilterService
    payroll_fixed = fix_payroll_filter_service()
    
    # 3. Crear queries corregidas
    create_corrected_queries()
    
    # 4. Verificar compatibilidad con frontend
    verify_frontend_compatibility()
    
    # 5. Crear script de pruebas
    create_testing_script()
    
    print(f"\\n🎯 RESUMEN DE CORRECCIONES:")
    print("=" * 30)
    print(f"✅ nominasService.js: {'Corregido' if nominas_fixed else 'Ya correcto'}")
    print(f"✅ payrollFilterService.js: {'Corregido' if payroll_fixed else 'Ya correcto'}")
    print("✅ Queries SQL corregidas generadas")
    print("✅ Script de pruebas creado")
    
    print(f"\\n🔧 PRÓXIMOS PASOS:")
    print("1. Reiniciar el servidor de API: npm restart")
    print("2. Ejecutar: python test_curp_corrections.py")
    print("3. Verificar que el dashboard muestre datos reales")
    print("4. Probar búsquedas por CURP en lugar de RFC")

if __name__ == "__main__":
    main()
