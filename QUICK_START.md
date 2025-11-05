# 🚀 Quick Start - Payroll Employees

## ✅ ¡El sistema ya está listo!

### Opción 1: Usar script automático (Recomendado)
```powershell
.\start.bat
```

### Opción 2: Comandos manuales
```powershell
# 1. Instalar dependencias
pnpm install

# 2. Iniciar servidor de desarrollo
pnpm dev

# ➜ Abre http://localhost:5173/
```

## 📱 ¿Qué verás?

1. **Dashboard principal** con búsqueda de empleados
2. **Datos de prueba** cargados automáticamente (2 empleados de muestra)
3. **Filtros funcionales**: RFC, nombre, puesto, sucursal
4. **Tabla ordenable**: Clic en headers para ordenar (↑↓)
5. **Responsive design**: Funciona en móvil y desktop

## 🎯 Funcionalidades disponibles

### ✨ Búsqueda y Filtros
- Buscar por RFC o nombre
- Filtrar por puesto (multiselect)
- Filtrar por sucursal
- Búsqueda en tiempo real con debounce

### 📊 Vista de datos
- Tabla con formato de moneda mexicana (MXN)
- Estados coloreados (Activo = verde, Baja = rojo)
- Paginación automática (20 por página)
- Contador de empleados encontrados

### 📱 Diseño responsive
- Se adapta a móvil y desktop
- Scroll horizontal en tablas pequeñas
- Controles touch-friendly

## 🔧 Datos de origen

El sistema carga datos en este orden de prioridad:
1. **Backend API** (cuando esté configurado)
2. **Archivo de prueba** (`/test-employees.json`) ← **ACTUALMENTE ACTIVO**
3. **LocalStorage** (datos subidos por el usuario)
4. **Memoria** (vacío)

## 📈 Próximos pasos

Para usar con datos reales:
1. Ver `DEPLOYMENT.md` para setup completo de AWS
2. Configurar base de datos PostgreSQL
3. Configurar autenticación Cognito
4. Cargar datos reales vía API

## ❓ ¿Problemas?

Si algo no funciona:
```powershell
# Limpiar y reinstalar
rm -rf node_modules
pnpm install

# Verificar que Vite compile
pnpm build
```

**Puerto ocupado?** Vite automáticamente usa el siguiente disponible (5174, 5175, etc.)

---

🎉 **¡Listo para usar!** El sistema funciona completamente en modo local con datos de prueba.
