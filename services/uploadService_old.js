const XLSX = require('xlsx');
const Papa = require('papaparse');
const { Pool } = require('pg');

// Database configuration for Historic
const historicPool = new Pool({
        host: 'dbgsau.cgt6iqqkqla7.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'Historic',
  user: 'postgres',
  password: 'SanNicolasTotolapan23_Gloria5!',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Column definitions for detection and mapping
const NOMINAS_COLUMN_MAPPING = {
  'RFC': { dbColumn: 'RFC', type: 'text', required: true },
  'Nombre completo': { dbColumn: 'Nombre completo', type: 'text', required: true },
  'Puesto': { dbColumn: 'Puesto', type: 'text', required: false },
  'Compañía': { dbColumn: 'Compañía', type: 'text', required: false },
  'Sucursal': { dbColumn: 'Sucursal', type: 'text', required: false },
  'cvecia': { dbColumn: 'cvecia', type: 'text', required: false },
  'cvetno': { dbColumn: 'cvetno', type: 'text', required: false },
  'Localidad': { dbColumn: 'Localidad', type: 'text', required: false },
  'Periodicidad': { dbColumn: 'Periodicidad', type: 'text', required: false },
  'Clave trabajador': { dbColumn: 'Clave trabajador', type: 'text', required: false },
  'CURP': { dbColumn: 'CURP', type: 'text', required: false },
  'Sexo': { dbColumn: 'Sexo', type: 'text', required: false },
  'Número IMSS': { dbColumn: 'Número IMSS', type: 'text', required: false },
  'Antigüedad en FPL': { dbColumn: 'Antigüedad en FPL', type: 'date', required: false },
  'Fecha antigüedad': { dbColumn: 'Fecha antigüedad', type: 'date', required: false },
  'Fecha baja': { dbColumn: 'Fecha baja', type: 'date', required: false },
  'Status': { dbColumn: 'Status', type: 'text', required: false },
  'Mes': { dbColumn: 'Mes', type: 'text', required: false },
  'cveper': { dbColumn: 'cveper', type: 'date', required: false },
  'Periodo': { dbColumn: 'Periodo', type: 'text', required: false },
  'tipo': { dbColumn: ' tipo', type: 'text', required: false },
  'SDI': { dbColumn: ' SDI', type: 'numeric', required: false },
  'SD': { dbColumn: ' SD', type: 'numeric', required: false },
  'SUELDO CLIENTE': { dbColumn: ' SUELDO CLIENTE', type: 'numeric', required: false },
  'SUELDO': { dbColumn: ' SUELDO', type: 'numeric', required: false },
  'COMISIONES CLIENTE': { dbColumn: ' COMISIONES CLIENTE', type: 'numeric', required: false },
  'TOTAL DE PERCEPCIONES': { dbColumn: ' TOTAL DE PERCEPCIONES', type: 'numeric', required: false },
  'TOTAL DEDUCCIONES': { dbColumn: ' TOTAL DEDUCCIONES', type: 'numeric', required: false },
  'NETO ANTES DE VALES': { dbColumn: ' NETO ANTES DE VALES', type: 'numeric', required: false },
  'NETO A PAGAR': { dbColumn: ' NETO A PAGAR', type: 'numeric', required: false },
  'COSTO DE NOMINA': { dbColumn: ' COSTO DE NOMINA', type: 'numeric', required: false },
  'TOTAL A FACTURAR': { dbColumn: ' TOTAL A FACTURAR', type: 'numeric', required: false },
  'PTU': { dbColumn: 'PTU', type: 'numeric', required: false }
};

const FONDOS_COLUMN_MAPPING = {
  'numrfc': { dbColumn: 'numrfc', type: 'text', required: true },
  'nombre': { dbColumn: 'nombre', type: 'text', required: false },
  'cvecia': { dbColumn: 'cvecia', type: 'text', required: false },
  'descripcion_cvecia': { dbColumn: 'descripcion_cvecia', type: 'text', required: false },
  'cvetno': { dbColumn: 'cvetno', type: 'text', required: false },
  'descripcion_cvetno': { dbColumn: 'descripcion_cvetno', type: 'text', required: false },
  'cvetra': { dbColumn: 'cvetra', type: 'text', required: false },
  'fecpla': { dbColumn: 'fecpla', type: 'text', required: false },
  'fecalt': { dbColumn: 'fecalt', type: 'text', required: false },
  'fecant': { dbColumn: 'fecant', type: 'text', required: false },
  'fecbaj': { dbColumn: 'fecbaj', type: 'text', required: false },
  'status': { dbColumn: 'status', type: 'text', required: false },
  'observaciones': { dbColumn: 'observaciones', type: 'text', required: false },
  'antiguedad_en_fondo': { dbColumn: 'antiguedad_en_fondo', type: 'text', required: false },
  'saldo_inicial': { dbColumn: 'saldo_inicial', type: 'numeric', required: false },
  'saldo_final': { dbColumn: 'saldo_final', type: 'numeric', required: false }
};

const NOMINAS_REQUIRED_COLUMNS = Object.keys(NOMINAS_COLUMN_MAPPING).filter(col => NOMINAS_COLUMN_MAPPING[col].required);
const FONDOS_REQUIRED_COLUMNS = Object.keys(FONDOS_COLUMN_MAPPING).filter(col => FONDOS_COLUMN_MAPPING[col].required);

class UploadService {
  /**
   * Validates and detects the format of an Excel file
   */
  static async validateFile(fileBuffer) {
    try {
      // Read Excel file
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON to get headers
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (data.length < 1) {
        throw new Error('El archivo está vacío o no tiene encabezados válidos');
      }
      
      const headers = data[0].map(h => h ? h.toString().trim() : '').filter(h => h);
      
      if (headers.length === 0) {
        throw new Error('No se encontraron encabezados válidos en el archivo');
      }
      
      // Detect format based on headers
      const detectedType = this.detectFileFormat(headers);
      
      return {
        success: true,
        type: detectedType,
        headers,
        rowCount: data.length - 1, // Exclude header row
        message: `Archivo detectado como formato de ${detectedType === 'nominas' ? 'Nóminas' : 'Fondos'}`
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Error al procesar el archivo: ${error.message}`
      };
    }
  }
  
  /**
   * Detects if file is nominas or fondos format based on headers
   */
  static detectFileFormat(headers) {
    const headerSet = new Set(headers.map(h => h.toLowerCase()));
    
    // Check for nominas format
    const nominasMatches = NOMINAS_REQUIRED_COLUMNS.filter(col => 
      headerSet.has(col.toLowerCase())
    ).length;
    
    // Check for fondos format
    const fondosMatches = FONDOS_REQUIRED_COLUMNS.filter(col => 
      headerSet.has(col.toLowerCase())
    ).length;
    
    // Decision logic - nominas has more specific columns
    if (nominasMatches >= 3 && headerSet.has('rfc') && headerSet.has('nombre completo')) {
      return 'nominas';
    }
    
    if (fondosMatches >= 1 && headerSet.has('numrfc')) {
      return 'fondos';
    }
    
    // Additional checks for ambiguous cases
    if (headerSet.has('sueldo') || headerSet.has('neto a pagar') || headerSet.has('curp')) {
      return 'nominas';
    }
    
    if (headerSet.has('saldo_inicial') || headerSet.has('saldo_final') || headerSet.has('cvecia')) {
      return 'fondos';
    }
    
    return 'unknown';
  }
  
  /**
   * Processes and uploads data to the appropriate table
   */
  static async uploadData(fileBuffer, detectedType) {
    const client = await historicPool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Read Excel file
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (rawData.length < 2) {
        throw new Error('El archivo debe tener al menos una fila de datos además de los encabezados');
      }
      
      const headers = rawData[0];
      const dataRows = rawData.slice(1);
      
      let result;
      if (detectedType === 'nominas') {
        result = await this.processNominasData(client, headers, dataRows);
      } else if (detectedType === 'fondos') {
        result = await this.processFondosData(client, headers, dataRows);
      } else {
        throw new Error('Formato de archivo no reconocido');
      }
      
      await client.query('COMMIT');
      
      return {
        success: true,
        recordsInserted: result.inserted,
        duplicatesSkipped: result.duplicates,
        message: `Datos cargados exitosamente. ${result.inserted} registros insertados, ${result.duplicates} duplicados omitidos.`
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Process and insert nominas data
   */
  static async processNominasData(client, headers, dataRows) {
    let inserted = 0;
    let duplicates = 0;
    
    // Create header mapping
    const headerMap = {};
    headers.forEach((header, index) => {
      if (header) {
        headerMap[header.toString().trim()] = index;
      }
    });
    
    for (const row of dataRows) {
      // Skip empty rows
      if (!row || row.every(cell => !cell)) continue;
      
      try {
        // Extract values based on column mapping
        const rfc = this.getValueByHeader(row, headerMap, 'RFC');
        
        if (!rfc) {
          console.log('Skipping row without RFC');
          continue;
        }
        
        // Check for duplicates
        const duplicateCheck = await client.query(
          'SELECT RFC FROM historico_nominas_gsau WHERE RFC = $1 LIMIT 1',
          [rfc]
        );
        
        if (duplicateCheck.rows.length > 0) {
          duplicates++;
          continue;
        }
        
        // Prepare insert values
        const values = {
          rfc: rfc,
          nombre_completo: this.getValueByHeader(row, headerMap, 'Nombre completo'),
          puesto: this.getValueByHeader(row, headerMap, 'Puesto'),
          compania: this.getValueByHeader(row, headerMap, 'Compañía'),
          sucursal: this.getValueByHeader(row, headerMap, 'Sucursal'),
          cvecia: this.getValueByHeader(row, headerMap, 'cvecia'),
          cvetno: this.getValueByHeader(row, headerMap, 'cvetno'),
          localidad: this.getValueByHeader(row, headerMap, 'Localidad'),
          periodicidad: this.getValueByHeader(row, headerMap, 'Periodicidad'),
          clave_trabajador: this.getValueByHeader(row, headerMap, 'Clave trabajador'),
          curp: this.getValueByHeader(row, headerMap, 'CURP'),
          sexo: this.getValueByHeader(row, headerMap, 'Sexo'),
          numero_imss: this.getValueByHeader(row, headerMap, 'Número IMSS'),
          antiguedad_en_fpl: this.parseDateValue(this.getValueByHeader(row, headerMap, 'Antigüedad en FPL')),
          fecha_antiguedad: this.parseDateValue(this.getValueByHeader(row, headerMap, 'Fecha antigüedad')),
          fecha_baja: this.parseDateValue(this.getValueByHeader(row, headerMap, 'Fecha baja')),
          status: this.getValueByHeader(row, headerMap, 'Status'),
          mes: this.getValueByHeader(row, headerMap, 'Mes'),
          cveper: this.parseDateValue(this.getValueByHeader(row, headerMap, 'cveper')),
          periodo: this.getValueByHeader(row, headerMap, 'Periodo'),
          tipo: this.getValueByHeader(row, headerMap, 'tipo'),
          sdi: this.parseNumericValue(this.getValueByHeader(row, headerMap, 'SDI')),
          sd: this.parseNumericValue(this.getValueByHeader(row, headerMap, 'SD')),
          sueldo_cliente: this.parseNumericValue(this.getValueByHeader(row, headerMap, 'SUELDO CLIENTE')),
          sueldo: this.parseNumericValue(this.getValueByHeader(row, headerMap, 'SUELDO')),
          comisiones_cliente: this.parseNumericValue(this.getValueByHeader(row, headerMap, 'COMISIONES CLIENTE')),
          total_percepciones: this.parseNumericValue(this.getValueByHeader(row, headerMap, 'TOTAL DE PERCEPCIONES')),
          total_deducciones: this.parseNumericValue(this.getValueByHeader(row, headerMap, 'TOTAL DEDUCCIONES')),
          neto_antes_vales: this.parseNumericValue(this.getValueByHeader(row, headerMap, 'NETO ANTES DE VALES')),
          neto_a_pagar: this.parseNumericValue(this.getValueByHeader(row, headerMap, 'NETO A PAGAR')),
          costo_nomina: this.parseNumericValue(this.getValueByHeader(row, headerMap, 'COSTO DE NOMINA')),
          total_facturar: this.parseNumericValue(this.getValueByHeader(row, headerMap, 'TOTAL A FACTURAR')),
          ptu: this.parseNumericValue(this.getValueByHeader(row, headerMap, 'PTU'))
        };
        
        // Insert record
        await client.query(`
          INSERT INTO historico_nominas_gsau (
            "RFC", "Nombre completo", "Puesto", "Compañía", "Sucursal", "cvecia", "cvetno",
            "Localidad", "Periodicidad", "Clave trabajador", "CURP", "Sexo", "Número IMSS",
            "Antigüedad en FPL", "Fecha antigüedad", "Fecha baja", "Status", "Mes", "cveper",
            "Periodo", " tipo", " SDI", " SD", " SUELDO CLIENTE", " SUELDO", " COMISIONES CLIENTE",
            " TOTAL DE PERCEPCIONES", " TOTAL DEDUCCIONES", " NETO ANTES DE VALES", " NETO A PAGAR",
            " COSTO DE NOMINA", " TOTAL A FACTURAR", "PTU"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
            $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33
          )
        `, [
          values.rfc, values.nombre_completo, values.puesto, values.compania, values.sucursal,
          values.cvecia, values.cvetno, values.localidad, values.periodicidad, values.clave_trabajador,
          values.curp, values.sexo, values.numero_imss, values.antiguedad_en_fpl, values.fecha_antiguedad,
          values.fecha_baja, values.status, values.mes, values.cveper, values.periodo, values.tipo,
          values.sdi, values.sd, values.sueldo_cliente, values.sueldo, values.comisiones_cliente,
          values.total_percepciones, values.total_deducciones, values.neto_antes_vales, values.neto_a_pagar,
          values.costo_nomina, values.total_facturar, values.ptu
        ]);
        
        inserted++;
        
      } catch (rowError) {
        console.error('Error processing row:', rowError);
        // Continue with next row
      }
    }
    
    return { inserted, duplicates };
  }
  
  /**
   * Process and insert fondos data
   */
  static async processFondosData(client, headers, dataRows) {
    let inserted = 0;
    let duplicates = 0;
    
    // Create header mapping
    const headerMap = {};
    headers.forEach((header, index) => {
      if (header) {
        headerMap[header.toString().trim()] = index;
      }
    });
    
    for (const row of dataRows) {
      // Skip empty rows
      if (!row || row.every(cell => !cell)) continue;
      
      try {
        // Extract values based on column mapping
        const numrfc = this.getValueByHeader(row, headerMap, 'numrfc');
        
        if (!numrfc) {
          console.log('Skipping row without numrfc');
          continue;
        }
        
        // Check for duplicates
        const duplicateCheck = await client.query(
          'SELECT numrfc FROM historico_fondos_gsau WHERE numrfc = $1 LIMIT 1',
          [numrfc]
        );
        
        if (duplicateCheck.rows.length > 0) {
          duplicates++;
          continue;
        }
        
        // Prepare insert values
        const values = {
          numrfc: numrfc,
          nombre: this.getValueByHeader(row, headerMap, 'nombre'),
          cvecia: this.getValueByHeader(row, headerMap, 'cvecia'),
          descripcion_cvecia: this.getValueByHeader(row, headerMap, 'descripcion_cvecia'),
          cvetno: this.getValueByHeader(row, headerMap, 'cvetno'),
          descripcion_cvetno: this.getValueByHeader(row, headerMap, 'descripcion_cvetno'),
          cvetra: this.getValueByHeader(row, headerMap, 'cvetra'),
          fecpla: this.getValueByHeader(row, headerMap, 'fecpla'),
          fecalt: this.getValueByHeader(row, headerMap, 'fecalt'),
          fecant: this.getValueByHeader(row, headerMap, 'fecant'),
          fecbaj: this.getValueByHeader(row, headerMap, 'fecbaj'),
          status: this.getValueByHeader(row, headerMap, 'status'),
          observaciones: this.getValueByHeader(row, headerMap, 'observaciones'),
          antiguedad_en_fondo: this.getValueByHeader(row, headerMap, 'antiguedad_en_fondo'),
          saldo_inicial: this.parseNumericValue(this.getValueByHeader(row, headerMap, 'saldo_inicial')),
          saldo_final: this.parseNumericValue(this.getValueByHeader(row, headerMap, 'saldo_final'))
        };
        
        // Insert record
        await client.query(`
          INSERT INTO historico_fondos_gsau (
            numrfc, nombre, cvecia, descripcion_cvecia, cvetno, descripcion_cvetno,
            cvetra, fecpla, fecalt, fecant, fecbaj, status, observaciones,
            antiguedad_en_fondo, saldo_inicial, saldo_final
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
          )
        `, [
          values.numrfc, values.nombre, values.cvecia, values.descripcion_cvecia,
          values.cvetno, values.descripcion_cvetno, values.cvetra, values.fecpla,
          values.fecalt, values.fecant, values.fecbaj, values.status,
          values.observaciones, values.antiguedad_en_fondo, values.saldo_inicial,
          values.saldo_final
        ]);
        
        inserted++;
        
      } catch (rowError) {
        console.error('Error processing row:', rowError);
        // Continue with next row
      }
    }
    
    return { inserted, duplicates };
  }
  
  /**
   * Helper method to get value from row by header name
   */
  static getValueByHeader(row, headerMap, headerName) {
    const index = headerMap[headerName];
    if (index !== undefined && row[index] !== undefined && row[index] !== null) {
      const value = row[index].toString().trim();
      return value === '' ? null : value;
    }
    return null;
  }
  
  /**
   * Parse numeric values from Excel
   */
  static parseNumericValue(value) {
    if (!value) return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  
  /**
   * Parse date values from Excel
   */
  static parseDateValue(value) {
    if (!value) return null;
    
    try {
      // If it's already a date object or valid date string
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
      }
    } catch (error) {
      console.log('Date parsing error:', error);
    }
    
    return null;
  }
}

module.exports = UploadService;
