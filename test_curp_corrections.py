#!/usr/bin/env python3
"""
Script para probar que las correcciones de CURP vs RFC funcionan correctamente
"""

import requests
import json

def test_api_with_curp():
    """Probar API con CURP conocido"""
    base_url = "http://localhost:3001"
    
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
            print(f"\n✅ Endpoint demográfico exitoso:")
            print(f"   📊 Registros: {len(data.get('data', []))}")
            print(f"   🔢 Total: {data.get('total', 0)}")
        else:
            print(f"\n❌ Error en demográfico: {response.status_code}")
            
    except Exception as e:
        print(f"\n❌ Error probando demográfico: {e}")
    
    # 3. Probar conteo de CURPs únicos
    try:
        response = requests.get(f"{base_url}/api/payroll/demographic/unique-count")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ Conteo de CURPs únicos:")
            print(f"   🔢 CURPs únicos: {data.get('uniqueCurpCount', 0)}")
        else:
            print(f"\n❌ Error en conteo: {response.status_code}")
            
    except Exception as e:
        print(f"\n❌ Error probando conteo: {e}")

if __name__ == "__main__":
    print("🎯 INICIANDO PRUEBAS POST-CORRECCIÓN")
    print("Asegúrate de que el servidor esté corriendo en localhost:3001\n")
    
    test_api_with_curp()
    
    print("\n🏁 PRUEBAS COMPLETADAS")
