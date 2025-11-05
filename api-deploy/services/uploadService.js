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
   * Validates and detects the format of a file (Excel or CSV)
   */
  static async validateFile(fileBuffer, mimeType) {
    try {
      console.log('🔍 === INICIANDO VALIDACIÓN DE ARCHIVO ===');
      console.log(`📄 Tipo MIME: ${mimeType}`);
      
      let data, headers;
      
      // Process based on file type
      if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        console.log('📊 Procesando archivo Excel (.xlsx)');
        data = this.parseExcelFile(fileBuffer);
      } else if (mimeType === 'text/csv') {
        console.log('📊 Procesando archivo CSV (.csv)');
        data = this.parseCSVFile(fileBuffer);
      } else {
        throw new Error('Formato de archivo no soportado. Solo se permiten .xlsx y .csv');
      }
      
      if (data.length < 1) {
        throw new Error('El archivo está vacío o no tiene encabezados válidos');
      }
      
      headers = data[0].map(h => h ? h.toString().trim() : '').filter(h => h);
      
      if (headers.length === 0) {
        throw new Error('No se encontraron encabezados válidos en el archivo');
      }
      
      console.log(`📋 Encabezados encontrados (${headers.length}):`, headers);
      
      // Detect format based on headers
      const detectedType = this.detectFileFormat(headers);
      console.log(`🎯 Tipo detectado: ${detectedType}`);
      
      // Validate column mapping
      const mappingValidation = this.validateColumnMapping(headers, detectedType);
      
      return {
        success: true,
        type: detectedType,
        headers,
        rowCount: data.length - 1,
        mappingValidation,
        message: `Archivo detectado como formato de ${detectedType === 'nominas' ? 'Nóminas' : 'Fondos'}`
      };
      
    } catch (error) {
      console.error('❌ Error en validación:', error.message);
      return {
        success: false,
        message: `Error al procesar el archivo: ${error.message}`
      };
    }
  }
  
  /**
   * Parse Excel file to array format
   */
  static parseExcelFile(fileBuffer) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  }
  
  /**
   * Parse CSV file to array format
   */
  static parseCSVFile(fileBuffer) {
    const csvString = fileBuffer.toString('utf-8');
    const result = Papa.parse(csvString, {
      header: false,
      skipEmptyLines: true,
      transform: (value) => {
        // Clean up the value
        if (typeof value === 'string') {
          value = value.trim();
        }
        return value;
      }
    });
    
    if (result.errors.length > 0) {
      console.warn('⚠️  Advertencias CSV:', result.errors);
    }
    
    return result.data;
  }
  
  /**
   * Detects if file is nominas or fondos format based on headers
   */
  static detectFileFormat(headers) {
    console.log('🔍 === INICIANDO DETECCIÓN DE FORMATO ===');
    
    const headerSet = new Set(headers.map(h => h.toLowerCase()));
    console.log('📋 Headers normalizados:', Array.from(headerSet));
    
    // Check for nominas format
    const nominasMatches = NOMINAS_REQUIRED_COLUMNS.filter(col => 
      headerSet.has(col.toLowerCase())
    );
    console.log(`✅ Columnas de nóminas encontradas (${nominasMatches.length}/${NOMINAS_REQUIRED_COLUMNS.length}):`, nominasMatches);
    
    // Check for fondos format
    const fondosMatches = FONDOS_REQUIRED_COLUMNS.filter(col => 
      headerSet.has(col.toLowerCase())
    );
    console.log(`✅ Columnas de fondos encontradas (${fondosMatches.length}/${FONDOS_REQUIRED_COLUMNS.length}):`, fondosMatches);
    
    // Decision logic
    if (nominasMatches.length >= 1 && headerSet.has('rfc')) {
      console.log('🎯 Detectado como: NÓMINAS');
      return 'nominas';
    }
    
    if (fondosMatches.length >= 1 && headerSet.has('numrfc')) {
      console.log('🎯 Detectado como: FONDOS');
      return 'fondos';
    }
    
    // Additional checks for ambiguous cases
    const nominasIndicators = ['sueldo', 'neto a pagar', 'curp', 'compañía'];
    const fondosIndicators = ['saldo_inicial', 'saldo_final', 'cvecia'];
    
    const nominasScore = nominasIndicators.filter(ind => headerSet.has(ind)).length;
    const fondosScore = fondosIndicators.filter(ind => headerSet.has(ind)).length;
    
    console.log(`📊 Puntuación nóminas: ${nominasScore}, fondos: ${fondosScore}`);
    
    if (nominasScore > fondosScore) {
      console.log('🎯 Detectado como: NÓMINAS (por indicadores)');
      return 'nominas';
    }
    
    if (fondosScore > nominasScore) {
      console.log('🎯 Detectado como: FONDOS (por indicadores)');
      return 'fondos';
    }
    
    console.log('❓ No se pudo determinar el formato');
    return 'unknown';
  }
  
  /**
   * Validate column mapping and show detailed logging
   */
  static validateColumnMapping(headers, detectedType) {
    console.log('🔍 === VALIDANDO MAPEO DE COLUMNAS ===');
    
    const mapping = detectedType === 'nominas' ? NOMINAS_COLUMN_MAPPING : FONDOS_COLUMN_MAPPING;
    const validation = {
      mappedColumns: [],
      unmappedColumns: [],
      missingRequired: [],
      typeValidation: []
    };
    
    headers.forEach(header => {
      const mappingInfo = mapping[header];
      if (mappingInfo) {
        validation.mappedColumns.push({
          fileColumn: header,
          dbColumn: mappingInfo.dbColumn,
          type: mappingInfo.type,
          required: mappingInfo.required
        });
        console.log(`✅ MAPEADA: "${header}" -> "${mappingInfo.dbColumn}" (${mappingInfo.type}${mappingInfo.required ? ', REQUERIDA' : ''})`);
      } else {
        validation.unmappedColumns.push(header);
        console.log(`⚠️  NO MAPEADA: "${header}"`);
      }
    });
    
    // Check for missing required columns
    const requiredColumns = Object.keys(mapping).filter(col => mapping[col].required);
    const mappedColumnNames = validation.mappedColumns.map(col => col.fileColumn);
    
    requiredColumns.forEach(reqCol => {
      if (!mappedColumnNames.includes(reqCol)) {
        validation.missingRequired.push(reqCol);
        console.log(`❌ FALTA COLUMNA REQUERIDA: "${reqCol}"`);
      }
    });
    
    console.log('📊 === RESUMEN DE MAPEO ===');
    console.log(`✅ Columnas mapeadas: ${validation.mappedColumns.length}`);
    console.log(`⚠️  Columnas no mapeadas: ${validation.unmappedColumns.length}`);
    console.log(`❌ Columnas requeridas faltantes: ${validation.missingRequired.length}`);
    
    return validation;
  }
  
  /**
   * Processes and uploads data to the appropriate table
   */
  static async uploadData(fileBuffer, detectedType, mimeType) {
    console.log('🚀 === INICIANDO CARGA DE DATOS ===');
    const client = await historicPool.connect();
    
    try {
      await client.query('BEGIN');
      
      let data;
      if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        data = this.parseExcelFile(fileBuffer);
      } else if (mimeType === 'text/csv') {
        data = this.parseCSVFile(fileBuffer);
      } else {
        throw new Error('Formato de archivo no soportado');
      }
      
      if (data.length < 2) {
        throw new Error('El archivo debe tener al menos una fila de datos además de los encabezados');
      }
      
      const headers = data[0];
      const dataRows = data.slice(1);
      
      console.log(`📋 Procesando ${dataRows.length} filas de datos`);
      
      let result;
      if (detectedType === 'nominas') {
        result = await this.processNominasData(client, headers, dataRows);
      } else if (detectedType === 'fondos') {
        result = await this.processFondosData(client, headers, dataRows);
      } else {
        throw new Error('Formato de archivo no reconocido');
      }
      
      await client.query('COMMIT');
      console.log('✅ Transacción confirmada');
      
      return {
        success: true,
        recordsInserted: result.inserted,
        duplicatesSkipped: result.duplicates,
        errors: result.errors || [],
        message: `Datos cargados exitosamente. ${result.inserted} registros insertados, ${result.duplicates} duplicados omitidos.`
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error en carga, rollback ejecutado:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Process and insert nominas data with detailed logging
   */
  static async processNominasData(client, headers, dataRows) {
    console.log('📊 === PROCESANDO DATOS DE NÓMINAS ===');
    let inserted = 0;
    let duplicates = 0;
    let errors = [];
    
    // Create header mapping
    const headerMap = {};
    headers.forEach((header, index) => {
      if (header) {
        headerMap[header.toString().trim()] = index;
      }
    });
    
    console.log('🗺️  Mapa de encabezados creado:', Object.keys(headerMap));
    
    for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
      const row = dataRows[rowIndex];
      
      // Skip empty rows
      if (!row || row.every(cell => !cell)) {
        console.log(`⏭️  Saltando fila vacía ${rowIndex + 2}`);
        continue;
      }
      
      try {
        // Extract and validate values
        const rfc = this.getValueByHeader(row, headerMap, 'RFC');
        
        if (!rfc) {
          console.log(`⚠️  Fila ${rowIndex + 2}: Sin RFC, saltando`);
          continue;
        }
        
        console.log(`📝 Procesando fila ${rowIndex + 2}, RFC: ${rfc}`);
        
        // Check for duplicates
        const duplicateCheck = await client.query(
          'SELECT "RFC" FROM historico_nominas_gsau WHERE "RFC" = $1 LIMIT 1',
          [rfc]
        );
        
        if (duplicateCheck.rows.length > 0) {
          console.log(`🔄 Duplicado encontrado: RFC ${rfc}`);
          duplicates++;
          continue;
        }
        
        // Process and convert values according to mapping
        const processedData = this.processNominasRow(row, headerMap, rowIndex + 2);
        
        // Insert record
        const insertQuery = `
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
        `;
        
        await client.query(insertQuery, processedData);
        inserted++;
        console.log(`✅ Insertado: RFC ${rfc}`);
        
      } catch (rowError) {
        const errorMsg = `Error en fila ${rowIndex + 2}: ${rowError.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
        // Continue with next row
      }
    }
    
    console.log('📊 === RESUMEN NÓMINAS ===');
    console.log(`✅ Insertados: ${inserted}`);
    console.log(`🔄 Duplicados: ${duplicates}`);
    console.log(`❌ Errores: ${errors.length}`);
    
    return { inserted, duplicates, errors };
  }
  
  /**
   * Process a single nominas row with type conversion and validation
   */
  static processNominasRow(row, headerMap, rowNumber) {
    console.log(`🔄 Convirtiendo datos de fila ${rowNumber}:`);
    
    const values = [
      this.getValueByHeader(row, headerMap, 'RFC'), // $1
      this.getValueByHeader(row, headerMap, 'Nombre completo'), // $2
      this.getValueByHeader(row, headerMap, 'Puesto'), // $3
      this.getValueByHeader(row, headerMap, 'Compañía'), // $4
      this.getValueByHeader(row, headerMap, 'Sucursal'), // $5
      this.getValueByHeader(row, headerMap, 'cvecia'), // $6
      this.getValueByHeader(row, headerMap, 'cvetno'), // $7
      this.getValueByHeader(row, headerMap, 'Localidad'), // $8
      this.getValueByHeader(row, headerMap, 'Periodicidad'), // $9
      this.getValueByHeader(row, headerMap, 'Clave trabajador'), // $10
      this.getValueByHeader(row, headerMap, 'CURP'), // $11
      this.getValueByHeader(row, headerMap, 'Sexo'), // $12
      this.getValueByHeader(row, headerMap, 'Número IMSS'), // $13
      this.parseDateValue(this.getValueByHeader(row, headerMap, 'Antigüedad en FPL'), 'Antigüedad en FPL'), // $14
      this.parseDateValue(this.getValueByHeader(row, headerMap, 'Fecha antigüedad'), 'Fecha antigüedad'), // $15
      this.parseDateValue(this.getValueByHeader(row, headerMap, 'Fecha baja'), 'Fecha baja'), // $16
      this.getValueByHeader(row, headerMap, 'Status'), // $17
      this.getValueByHeader(row, headerMap, 'Mes'), // $18
      this.parseDateValue(this.getValueByHeader(row, headerMap, 'cveper'), 'cveper'), // $19
      this.getValueByHeader(row, headerMap, 'Periodo'), // $20
      this.getValueByHeader(row, headerMap, 'tipo'), // $21
      this.parseNumericValue(this.getValueByHeader(row, headerMap, 'SDI'), 'SDI'), // $22
      this.parseNumericValue(this.getValueByHeader(row, headerMap, 'SD'), 'SD'), // $23
      this.parseNumericValue(this.getValueByHeader(row, headerMap, 'SUELDO CLIENTE'), 'SUELDO CLIENTE'), // $24
      this.parseNumericValue(this.getValueByHeader(row, headerMap, 'SUELDO'), 'SUELDO'), // $25
      this.parseNumericValue(this.getValueByHeader(row, headerMap, 'COMISIONES CLIENTE'), 'COMISIONES CLIENTE'), // $26
      this.parseNumericValue(this.getValueByHeader(row, headerMap, 'TOTAL DE PERCEPCIONES'), 'TOTAL DE PERCEPCIONES'), // $27
      this.parseNumericValue(this.getValueByHeader(row, headerMap, 'TOTAL DEDUCCIONES'), 'TOTAL DEDUCCIONES'), // $28
      this.parseNumericValue(this.getValueByHeader(row, headerMap, 'NETO ANTES DE VALES'), 'NETO ANTES DE VALES'), // $29
      this.parseNumericValue(this.getValueByHeader(row, headerMap, 'NETO A PAGAR'), 'NETO A PAGAR'), // $30
      this.parseNumericValue(this.getValueByHeader(row, headerMap, 'COSTO DE NOMINA'), 'COSTO DE NOMINA'), // $31
      this.parseNumericValue(this.getValueByHeader(row, headerMap, 'TOTAL A FACTURAR'), 'TOTAL A FACTURAR'), // $32
      this.parseNumericValue(this.getValueByHeader(row, headerMap, 'PTU'), 'PTU') // $33
    ];
    
    return values;
  }
  
  /**
   * Process and insert fondos data with detailed logging
   */
  static async processFondosData(client, headers, dataRows) {
    console.log('💰 === PROCESANDO DATOS DE FONDOS ===');
    let inserted = 0;
    let duplicates = 0;
    let errors = [];
    
    // Create header mapping
    const headerMap = {};
    headers.forEach((header, index) => {
      if (header) {
        headerMap[header.toString().trim()] = index;
      }
    });
    
    console.log('🗺️  Mapa de encabezados creado:', Object.keys(headerMap));
    
    for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
      const row = dataRows[rowIndex];
      
      // Skip empty rows
      if (!row || row.every(cell => !cell)) {
        console.log(`⏭️  Saltando fila vacía ${rowIndex + 2}`);
        continue;
      }
      
      try {
        // Extract and validate values
        const numrfc = this.getValueByHeader(row, headerMap, 'numrfc');
        
        if (!numrfc) {
          console.log(`⚠️  Fila ${rowIndex + 2}: Sin numrfc, saltando`);
          continue;
        }
        
        console.log(`📝 Procesando fila ${rowIndex + 2}, numrfc: ${numrfc}`);
        
        // Check for duplicates
        const duplicateCheck = await client.query(
          'SELECT numrfc FROM historico_fondos_gsau WHERE numrfc = $1 LIMIT 1',
          [numrfc]
        );
        
        if (duplicateCheck.rows.length > 0) {
          console.log(`🔄 Duplicado encontrado: numrfc ${numrfc}`);
          duplicates++;
          continue;
        }
        
        // Process and convert values according to mapping
        const processedData = this.processFondosRow(row, headerMap, rowIndex + 2);
        
        // Insert record
        const insertQuery = `
          INSERT INTO historico_fondos_gsau (
            numrfc, nombre, cvecia, descripcion_cvecia, cvetno, descripcion_cvetno,
            cvetra, fecpla, fecalt, fecant, fecbaj, status, observaciones,
            antiguedad_en_fondo, saldo_inicial, saldo_final
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
          )
        `;
        
        await client.query(insertQuery, processedData);
        inserted++;
        console.log(`✅ Insertado: numrfc ${numrfc}`);
        
      } catch (rowError) {
        const errorMsg = `Error en fila ${rowIndex + 2}: ${rowError.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
        // Continue with next row
      }
    }
    
    console.log('📊 === RESUMEN FONDOS ===');
    console.log(`✅ Insertados: ${inserted}`);
    console.log(`🔄 Duplicados: ${duplicates}`);
    console.log(`❌ Errores: ${errors.length}`);
    
    return { inserted, duplicates, errors };
  }
  
  /**
   * Process a single fondos row with type conversion and validation
   */
  static processFondosRow(row, headerMap, rowNumber) {
    console.log(`🔄 Convirtiendo datos de fila ${rowNumber}:`);
    
    const values = [
      this.getValueByHeader(row, headerMap, 'numrfc'), // $1
      this.getValueByHeader(row, headerMap, 'nombre'), // $2
      this.getValueByHeader(row, headerMap, 'cvecia'), // $3
      this.getValueByHeader(row, headerMap, 'descripcion_cvecia'), // $4
      this.getValueByHeader(row, headerMap, 'cvetno'), // $5
      this.getValueByHeader(row, headerMap, 'descripcion_cvetno'), // $6
      this.getValueByHeader(row, headerMap, 'cvetra'), // $7
      this.getValueByHeader(row, headerMap, 'fecpla'), // $8
      this.getValueByHeader(row, headerMap, 'fecalt'), // $9
      this.getValueByHeader(row, headerMap, 'fecant'), // $10
      this.getValueByHeader(row, headerMap, 'fecbaj'), // $11
      this.getValueByHeader(row, headerMap, 'status'), // $12
      this.getValueByHeader(row, headerMap, 'observaciones'), // $13
      this.getValueByHeader(row, headerMap, 'antiguedad_en_fondo'), // $14
      this.parseNumericValue(this.getValueByHeader(row, headerMap, 'saldo_inicial'), 'saldo_inicial'), // $15
      this.parseNumericValue(this.getValueByHeader(row, headerMap, 'saldo_final'), 'saldo_final') // $16
    ];
    
    return values;
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
   * Parse numeric values with detailed logging
   */
  static parseNumericValue(value, columnName) {
    if (!value) return null;
    
    // Clean value (remove commas, currency symbols, etc.)
    let cleanValue = value.toString().replace(/[,$%]/g, '');
    
    const parsed = parseFloat(cleanValue);
    if (isNaN(parsed)) {
      console.log(`⚠️  Valor numérico inválido en ${columnName}: "${value}" -> NULL`);
      return null;
    }
    
    console.log(`🔢 ${columnName}: "${value}" -> ${parsed}`);
    return parsed;
  }
  
  /**
   * Parse date values with detailed logging
   */
  static parseDateValue(value, columnName) {
    if (!value) return null;
    
    try {
      let dateValue = value;
      
      // Handle different date formats
      if (typeof dateValue === 'string') {
        // Try common formats: dd/mm/yyyy, mm/dd/yyyy, yyyy-mm-dd
        const formats = [
          /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // dd/mm/yyyy or mm/dd/yyyy
          /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // yyyy-mm-dd
          /^(\d{1,2})-(\d{1,2})-(\d{4})$/ // dd-mm-yyyy
        ];
        
        for (const format of formats) {
          if (format.test(dateValue)) {
            dateValue = new Date(dateValue);
            break;
          }
        }
      }
      
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
        console.log(`📅 ${columnName}: "${value}" -> ${formattedDate}`);
        return formattedDate;
      }
    } catch (error) {
      console.log(`⚠️  Fecha inválida en ${columnName}: "${value}" -> NULL (${error.message})`);
    }
    
    console.log(`⚠️  Fecha inválida en ${columnName}: "${value}" -> NULL`);
    return null;
  }
}

module.exports = UploadService;
