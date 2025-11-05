/**
 * Mapeo completo de campos de la tabla "historico_nominas_gsau"
 * NOMBRES EXACTOS obtenidos directamente de la base de datos AWS
 * Datos provenientes de historico_nominas_gsau según la regla del usuario
 */

export const FIELDS_MAPPING = {
  // ==================== IDENTIFICACIÓN ====================
  Identificacion: {
    cvecia: "cvecia",
    compania: "Compañía", 
    cvetno: "cvetno",
    sucursal: "Sucursal",
    localidad: "Localidad",
    periodicidad: "Periodicidad",
    claveTrabajador: "Clave trabajador",
    nombreCompleto: "Nombre completo", // CORREGIDO: nombre exacto de la columna
    puesto: "Puesto",
    rfc: "RFC", // CORREGIDO: nombre exacto de la columna
    curp: "CURP", // CORREGIDO: nombre exacto de la columna
    sexo: "Sexo",
    numeroIMSS: "Número IMSS",
    antiguedadFPL: "Antigüedad en FPL",
    fechaAntiguedad: "Fecha antigüedad",
    fechaBaja: "Fecha baja",
    status: "Status",
    mes: "Mes", // CORREGIDO: nombre exacto de la columna
    cveper: "cveper", // Campo clave para filtros de período
    periodo: "Periodo",
    tipo: " tipo " // CORREGIDO: incluye espacios
  },

  // ==================== PERCEPCIONES ====================
  Percepciones: {
    // Salarios Base - NOMBRES EXACTOS CON ESPACIOS
    SDI: " SDI ",
    sdiEs: " sdi_es ",
    SD: " SD ", 
    sdim: " sdim ",
    sueldoCliente: " SUELDO CLIENTE ",
    sueldo: " SUELDO ",
    
    // Comisiones - NOMBRES EXACTOS CON ESPACIOS
    comisionesCliente: " COMISIONES CLIENTE ",
    comisionesFacturadas: " COMISIONES FACTURADAS ",
    comisiones: " COMISIONES ",
    
    // Trabajo por Destajo - NOMBRES EXACTOS CON ESPACIOS
    destajoInformado: " DESTAJO INFORMADO ",
    destajo: " DESTAJO ",
    
    // Premios y Reconocimientos - NOMBRES EXACTOS CON ESPACIOS
    premioPuntualidad: " PREMIO PUNTUALIDAD ",
    premioAsistencia: " PREMIO ASISTENCIA ",
    
    // Vales y Beneficios - NOMBRES EXACTOS CON ESPACIOS
    valesDespensa: " VALES DE DESPENSA ",
    valesDespensaNeto: " VALES DESPENSA NETO ", 
    valesDespensaPensionAliment: " VALES DESPENSA PENSION ALIMENT ",
    
    // Bonos y Extras - NOMBRES EXACTOS CON ESPACIOS
    bono: " BONO ",
    diaFestivoTrabajado: " DIA FESTIVO TRABAJADO ",
    sueldoXDiasAcVacaciones: " SUELDO X DIAS AC VACACIONES ",
    primaVacacional: " PRIMA VACACIONAL ",
    aguinaldo: " AGUINALDO ",
    gratificacion: " GRATIFICACION ",
    compensacion: " COMPENSACION ",
    primaDominical: " PRIMA DOMINICAL ",
    primaAntiguedad: " PRIMA DE ANTIGÜEDAD ",
    pagoSeparacion: " PAGO POR SEPARACION ",
    
    // Vacaciones - NOMBRES EXACTOS CON ESPACIOS
    vacacionesPendientes: " VACACIONES PENDIENTES ",
    vacacionesFiniquito: " VACACIONES FINIQUITO ",
    
    // Subsidios - NOMBRES EXACTOS CON ESPACIOS
    subsidioPorIncapacidad: " SUBSIDIO POR INCAPACIDAD ",
    subsidioAlEmpleo: " SUBSIDIO AL EMPLEO ",
    
    // Horas Extra - NOMBRES EXACTOS CON ESPACIOS
    horasExtraDoble: " HORAS EXTRA DOBLE ",
    horasExtraDoble3: " HORAS EXTRA DOBLE3 ",
    horasExtraTriple: " HORAS EXTRA TRIPLE ",
    
    // Otros - NOMBRES EXACTOS CON ESPACIOS
    diasPromedio: " DIAS PROMEDIO ",
    diasPendientesPorIngreso: " DIAS PENDIENTES POR INGRESO ",
    septimoDia: " SEPTIMO DIA ",
    reintegroISR: " REINTEGRO ISR ",
    isrAnualAFavor: " ISR ANUAL A FAVOR ",
    diferenciaFonacot: " DIFERENCIA FONACOT ",
    diferenciaInfonavit: " DIFERENCIA INFONAVIT ",
    indemnizacion90Dias: " INDEMNIZACION 90 DIAS ",
    PTU: " PTU "
  },

  // ==================== DEDUCCIONES ====================
  Deducciones: {
    // Descuentos Varios - NOMBRES EXACTOS CON ESPACIOS
    descuentoIndebido: " DESCUENTO INDEBIDO ",
    
    // ISR - NOMBRES EXACTOS CON ESPACIOS
    reintegroISR: " REINTEGRO ISR ",
    isrAnualAFavor: " ISR ANUAL A FAVOR ",
    ISR: " ISR ",
    isrIndemnizacion: " ISR INDEMNIZACION ",
    
    // FONACOT - NOMBRES EXACTOS CON ESPACIOS
    diferenciaFonacot: " DIFERENCIA FONACOT ",
    diferenciaFonacot5: " DIFERENCIA FONACOT5 ",
    fonacot: " FONACOT ",
    
    // INFONAVIT - NOMBRES EXACTOS CON ESPACIOS
    diferenciaInfonavit: " DIFERENCIA INFONAVIT ",
    diferenciaInfonavit4: " DIFERENCIA INFONAVIT4 ",
    descuentoInfonavit: " DESCUENTO INFONAVIT ",
    seguroVivienda: " SEGURO A LA VIVIENDA ",
    
    // IMSS - NOMBRES EXACTOS CON ESPACIOS
    descuentoIMSS: " DESCUENTO IMSS ",
    
    // Descuentos Laborales - NOMBRES EXACTOS CON ESPACIOS
    retardos: " RETARDOS ",
    
    // Préstamos - NOMBRES EXACTOS CON ESPACIOS
    prestamosPersonales: " PRESTAMOS PERSONALES ",
    prestamosPersonales6: " PRESTAMOS PERSONALES6 ",
    anticipoNomina: " ANTICIPO DE NOMINA ",
    
    // Pensión Alimenticia - NOMBRES EXACTOS CON ESPACIOS
    pensionAlimenticia: " PENSIÓN ALIMENTICIA ",
    pensionAlimenticiaFPL: " PENSION ALIMENTICIA FPL ",
    dctoPensionAlimenticiaVales: " DCTO PENSION ALIMENTICIA VALES ",
    
    // Otros Descuentos - NOMBRES EXACTOS CON ESPACIOS
    cuotaSindical: " CUOTA SINDICAL ",
    otrosDescuentos: " OTROS DESCUENTOS ",
    descuentosVarios: " DESCUENTOS VARIOS ",
    destruccionHerramientas: " DESTRUCCION HERRAMIENTAS ",
    descuentoUniformes: " DESCUENTO POR UNIFORMES ",
    aportacionCajaAhorro: " APORTACION CAJA DE AHORRO ",
    prestamoFPL: " PRESTAMO FPL ",
    
    // Ajustes - NOMBRES EXACTOS CON ESPACIOS
    ajusteSubsEmpleoPagado: " AJUSTE SUBS AL EMPLEO PAGADO "
  },

  // ==================== APORTACIONES PATRONALES ====================
  AportacionesPatronales: {
    // P.FPL (Fondo de Productividad Laboral) - NOMBRES EXACTOS CON ESPACIOS
    fpl: " P.FPL ",
    
    // Ayudas e Incapacidades - NOMBRES EXACTOS CON ESPACIOS
    ayudaPorIncapacidad: " AYUDA POR INCAPACIDAD ",
    
    // Aportaciones de Compra - NOMBRES EXACTOS CON ESPACIOS
    aportacionCompraPrestacion: " APORTACION COMPRA PRESTACIÓN ",
    apCompPrimasSeguro: " AP COMP PRIMAS SEGURO ",
    
    // IMSS - NOMBRES EXACTOS CON ESPACIOS
    imssPatronal: " IMSS PATRONAL ",
    
    // INFONAVIT - NOMBRES EXACTOS CON ESPACIOS
    infonavit: " INFONAVIT ",
    
    // Impuestos - NOMBRES EXACTOS CON ESPACIOS
    impuestoSobreNomina: " IMPUESTO SOBRE NÓMINA ",
    
    // Ayuda FPL - NOMBRES EXACTOS CON ESPACIOS
    ayudaFPL: "AYUDA FPL" // SIN ESPACIOS al principio y final
  },

  // ==================== TOTALES Y CONSOLIDADO ====================
  Totales: {
    // NOMBRES EXACTOS CON ESPACIOS de historico_nominas_gsau
    totalPercepciones: " TOTAL DE PERCEPCIONES ",
    
    totalDeducciones: " TOTAL DEDUCCIONES ", 
    
    netoAntesVales: " NETO ANTES DE VALES ",
    
    netoAPagar: " NETO A PAGAR ",
    
    subtotalCostoNomina: " SUBTOTAL COSTO DE NOMINA ",
    
    regalias: " REGALÍAS ",
    
    costoNomina: " COSTO DE NOMINA ",
    
    iva: " IVA ",
    
    totalAFacturar: " TOTAL A FACTURAR "
  }
};

/**
 * Función utilitaria para obtener el valor de un campo con múltiples posibles nombres
 * @param {Object} data - Objeto con los datos del registro
 * @param {Array} fieldNames - Array de posibles nombres del campo
 * @param {*} defaultValue - Valor por defecto si no se encuentra el campo
 * @returns {*} - Valor del campo encontrado o valor por defecto
 */
export const getFieldValue = (data, fieldNames, defaultValue = 0) => {
  // Logging temporal para debug
  if (fieldNames.includes('SUELDO') || fieldNames.includes('sueldo') || fieldNames.includes('COMISIONES')) {
    console.log(`🔍 Buscando campo:`, fieldNames, 'en datos:', Object.keys(data).slice(0, 10), '...');
  }
  
  for (const fieldName of fieldNames) {
    if (data[fieldName] !== undefined && data[fieldName] !== null) {
      if (fieldNames.includes('SUELDO') || fieldNames.includes('sueldo') || fieldNames.includes('COMISIONES')) {
        console.log(`✅ Encontrado campo:`, fieldName, '=', data[fieldName]);
      }
      return data[fieldName];
    }
  }
  
  if (fieldNames.includes('SUELDO') || fieldNames.includes('sueldo') || fieldNames.includes('COMISIONES')) {
    console.log(`❌ No se encontró ningún campo de:`, fieldNames, 'retornando:', defaultValue);
  }
  
  return defaultValue;
};

/**
 * Mapea los datos de un registro usando las opciones de nombres de campos disponibles
 * @param {Object} registro - Registro de la base de datos
 * @returns {Object} - Objeto con datos mapeados para los componentes
 */
export const mapEmployeeData = (registro) => {
  const { Identificacion, Percepciones, Deducciones, AportacionesPatronales, Totales } = FIELDS_MAPPING;
  
  return {
    // Información básica
    cveper: getFieldValue(registro, [Identificacion.cveper, Identificacion.mes]),
    nombre: getFieldValue(registro, [Identificacion.nombreCompleto], 'N/A'),
    rfc: getFieldValue(registro, [Identificacion.rfc], ''),
    curp: getFieldValue(registro, [Identificacion.curp], ''),
    
    // Percepciones mapeadas
    percepciones: {
      sdi: getFieldValue(registro, [Percepciones.SDI, Percepciones.sdi]),
      sdi_es: getFieldValue(registro, [Percepciones.sdiEs]),
      sd: getFieldValue(registro, [Percepciones.SD, Percepciones.sd]),
      sdim: getFieldValue(registro, [Percepciones.sdim]),
      sueldoCliente: getFieldValue(registro, [Percepciones.sueldoCliente]),
      sueldo: getFieldValue(registro, [Percepciones.sueldo]),
      comisionesCliente: getFieldValue(registro, [Percepciones.comisionesCliente]),
      comisionesFacturadas: getFieldValue(registro, [Percepciones.comisionesFacturadas]),
      comisiones: getFieldValue(registro, [Percepciones.comisiones]),
      ptu: getFieldValue(registro, [Percepciones.PTU, Percepciones.ptu])
      // ... agregar más campos según sea necesario
    },
    
    // Deducciones mapeadas
    deducciones: {
      isr: getFieldValue(registro, [Deducciones.isr, Deducciones.ISR]),
      fonacot: getFieldValue(registro, [Deducciones.fonacot, Deducciones.FONACOT]),
      descuentoIMSS: getFieldValue(registro, [Deducciones.descuentoIMSS, Deducciones.descuentoImss]),
      pensionAlimenticia: getFieldValue(registro, [Deducciones.pensionAlimenticia, Deducciones.pensionAlimenticiaAlt])
      // ... agregar más campos según sea necesario
    },
    
    // Aportaciones Patronales mapeadas
    aportacionesPatronales: {
      fpl: getFieldValue(registro, [AportacionesPatronales.fpl, AportacionesPatronales.pFPL, AportacionesPatronales.FPL]),
      imssPatronal: getFieldValue(registro, [AportacionesPatronales.imssPatronal, AportacionesPatronales.imssPatronalAlt]),
      infonavit: getFieldValue(registro, [AportacionesPatronales.infonavit, AportacionesPatronales.INFONAVIT])
      // ... agregar más campos según sea necesario
    },
    
    // Totales mapeados
    totales: {
      totalPercepciones: getFieldValue(registro, [Totales.totalPercepciones, Totales.totalPercepcionesAlt, Totales.totalPercepcionesAlt2]),
      totalDeducciones: getFieldValue(registro, [Totales.totalDeducciones, Totales.totalDeduccionesAlt, Totales.totalDeduccionesAlt2]),
      netoAPagar: getFieldValue(registro, [Totales.netoAPagar, Totales.netoAPagarAlt, Totales.netoAPagarAlt2]),
      totalAFacturar: getFieldValue(registro, [Totales.totalAFacturar, Totales.totalAFacturarAlt, Totales.totalAFacturarAlt2])
      // ... agregar más campos según sea necesario
    }
  };
};
