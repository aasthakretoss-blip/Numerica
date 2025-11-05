# 📋 Endpoint Requerido: Datos de Nómina por Empleado

## 🔗 **Endpoint**
```
GET /api/payroll/employee-data?curp={CURP}&cveper={PERIODO}
```

## 📝 **Descripción**
Este endpoint debe devolver los datos completos de nómina para un empleado específico (CURP) en un período específico (CVEPER), basándose en la tabla `historico_nominas_gsau`.

## 📊 **Parámetros de Consulta**

| Parámetro | Tipo     | Requerido | Descripción |
|-----------|----------|-----------|-------------|
| `curp`    | string   | ✅ Sí    | CURP del empleado |
| `cveper`  | string   | ✅ Sí    | Período de nómina (formato YYYY-MM-DD) |

### **Ejemplo de llamada:**
```
GET /api/payroll/employee-data?curp=AEMB930330MDFBGR07&cveper=2025-06-30
```

## 📤 **Respuesta Esperada**

```json
{
  "success": true,
  "data": {
    // Datos de identificación
    "cvecia": "001",
    "COMPANIA": "FPL CONSULTORIA",
    "cvetno": "001",
    "SUCURSAL": "MATRIZ",
    "LOCALIDAD": "GUADALAJARA",
    "PERIODICIDAD": "QUINCENAL",
    "CLAVE TRABAJADOR": "EMP001",
    "NOMBRE COMPLETO": "JUAN PEREZ GARCIA",
    "PUESTO": "DESARROLLADOR",
    "RFC": "PEGJ850101ABC",
    "CURP": "AEMB930330MDFBGR07",
    "SEXO": "M",
    "NUMERO IMSS": "12345678901",
    "ANTIGUEDAD EN FPL": "2 años",
    "FECHA ANTIGUEDAD": "2022-01-15",
    "FECHA BAJA": null,
    "STATUS": "A",
    "MES": "06",
    "cveper": "2025-06-30",
    "PERIODO": "2025-06-30",
    "TIPO": "NOMINA",

    // Percepciones (valores numéricos)
    "SDI": 450.75,
    "sdi_es": 450.75,
    "SD": 400.00,
    "sdim": 450.75,
    "SUELDO CLIENTE": 15000.00,
    "SUELDO": 15000.00,
    "COMISIONES CLIENTE": 2000.00,
    "COMISIONES FACTURADAS": 1800.00,
    "COMISIONES": 1800.00,
    "DESTAJO INFORMADO": 0.00,
    "DESTAJO": 0.00,
    "PREMIO PUNTUALIDAD": 500.00,
    "PREMIO ASISTENCIA": 300.00,
    "VALES DE DESPENSA": 1200.00,
    "VALES DESPENSA NETO": 1000.00,
    "VALES DESPENSA PENSION ALIMENT": 0.00,
    "BONO": 1000.00,
    "DIA FESTIVO TRABAJADO": 0.00,
    "SUELDO X DIAS AC VACACIONES": 0.00,
    "PRIMA VACACIONAL": 0.00,
    "AGUINALDO": 0.00,
    "GRATIFICACION": 0.00,
    "GRATIFICACION EXTRAORDINARIA": 0.00,
    "COMPENSACION": 0.00,
    "PRIMA DOMINICAL": 0.00,
    "PRIMA DE ANTIGÜEDAD": 0.00,
    "PAGO POR SEPARACION": 0.00,
    "VACACIONES PENDIENTES": 0.00,
    "VACACIONES FINIQUITO": 0.00,
    "SUBSIDIO POR INCAPACIDAD": 0.00,
    "SUBSIDIO AL EMPLEO": 0.00,
    "HORAS EXTRA DOBLE": 800.00,
    "HORAS EXTRA DOBLE3": 0.00,
    "HORAS EXTRA TRIPLE": 0.00,
    "SEPTIMO DIA": 600.00,
    "PTU": 0.00,

    // Deducciones (valores numéricos)
    "DESCUENTO INDEBIDO": 0.00,
    "REINTEGRO ISR": 0.00,
    "ISR ANUAL A FAVOR": 0.00,
    "ISR": 2500.50,
    "ISR INDEMNIZACION": 0.00,
    "DESCUENTO IMSS": 450.25,
    "RETARDOS": 0.00,
    "DESCUENTO INFONAVIT": 750.00,
    "DIFERENCIA INFONAVIT": 0.00,
    "DIFERENCIA INFONAVIT4": 0.00,
    "FONACOT": 0.00,
    "DIFERENCIA FONACOT": 0.00,
    "DIFERENCIA FONACOT5": 0.00,
    "PRESTAMOS PERSONALES": 0.00,
    "PRESTAMOS PERSONALES6": 0.00,
    "PENSIÓN ALIMENTICIA": 0.00,
    "PENSION ALIMENTICIA FPL": 0.00,
    "ANTICIPO DE NOMINA": 500.00,
    "CUOTA SINDICAL": 0.00,
    "DCTO PENSION ALIMENTICIA VALES": 0.00,
    "OTROS DESCUENTOS": 0.00,
    "DESCUENTOS VARIOS": 0.00,
    "DESTRUCCION HERRAMIENTAS": 0.00,
    "DESCUENTO POR UNIFORMES": 0.00,
    "APORTACION CAJA DE AHORRO": 300.00,
    "PRESTAMO FPL": 0.00,
    "AJUSTE SUBS AL EMPLEO PAGADO": 0.00,

    // Aportaciones Patronales (valores numéricos)
    "P.FPL": 1500.00,
    "AYUDA POR INCAPACIDAD": 0.00,
    "APORTACION COMPRA PRESTACIÓN": 200.00,
    "AP COMP PRIMAS SEGURO": 150.00,
    "IMSS PATRONAL": 1200.75,
    "INFONAVIT": 750.00,
    "IMPUESTO SOBRE NÓMINA": 600.00,
    "AYUDA FPL": 0.00,

    // Totales (valores numéricos)
    "TOTAL DE PERCEPCIONES": 21200.00,
    "TOTAL DEDUCCIONES": 4500.75,
    "NETO ANTES DE VALES": 16699.25,
    "NETO A PAGAR": 17699.25,
    "SUBTOTAL COSTO DE NOMINA": 25404.75,
    "COSTO DE NOMINA": 25404.75,
    "REGALÍAS": 254.05,
    "IVA": 4064.76,
    "TOTAL A FACTURAR": 29723.56
  }
}
```

## 🗄️ **Consulta SQL Sugerida**

```sql
SELECT *
FROM historico_nominas_gsau 
WHERE CURP = :curp 
  AND cveper = :cveper
LIMIT 1;
```

## ❌ **Respuesta de Error**

### **Caso: Empleado no encontrado**
```json
{
  "success": false,
  "error": "No se encontraron datos para el CURP y período especificados",
  "data": null
}
```

### **Caso: Parámetros faltantes**
```json
{
  "success": false,
  "error": "Parámetros requeridos: curp y cveper",
  "data": null
}
```

## 🔧 **Implementación Backend Sugerida**

### **Node.js/Express:**
```javascript
app.get('/api/payroll/employee-data', async (req, res) => {
  try {
    const { curp, cveper } = req.query;
    
    if (!curp || !cveper) {
      return res.status(400).json({
        success: false,
        error: 'Parámetros requeridos: curp y cveper'
      });
    }
    
    const result = await db.query(
      'SELECT * FROM historico_nominas_gsau WHERE CURP = ? AND cveper = ? LIMIT 1',
      [curp, cveper]
    );
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No se encontraron datos para el CURP y período especificados'
      });
    }
    
    res.json({
      success: true,
      data: result[0]
    });
    
  } catch (error) {
    console.error('Error fetching payroll data:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});
```

## 📋 **Notas Importantes**

1. **Formato de Datos**: Los valores monetarios deben ser numéricos (no strings)
2. **Encoding**: Asegurar UTF-8 para caracteres especiales
3. **Performance**: Considerar índices en CURP y cveper
4. **Seguridad**: Validar parámetros para prevenir SQL injection
5. **Cache**: Considerar cacheo para consultas frecuentes

## ✅ **Estado Actual**

- 🔴 **Endpoint no implementado** - Se requiere implementar en el backend
- ✅ **Frontend listo** - Los componentes están preparados para recibir los datos
- ✅ **Mapeo completado** - Todas las columnas están mapeadas correctamente
