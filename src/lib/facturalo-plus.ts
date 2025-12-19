/**
 * Factura-lo Plus API Integration
 *
 * This module handles all communication with the Factura-lo Plus billing service
 * for Mexican electronic invoicing (CFDI 4.0).
 *
 * API Documentation: https://app.facturaloplus.com/ws/servicio.do?wsdl
 * REST Endpoint: https://app.facturaloplus.com/api/rest/servicio/
 */

// Types for CFDI 4.0
export interface CFDIEmisor {
  Rfc: string
  Nombre: string
  RegimenFiscal: string
  DomicilioFiscalEmisor: string // Codigo Postal
}

export interface CFDIReceptor {
  Rfc: string
  Nombre: string
  UsoCFDI: string
  DomicilioFiscalReceptor: string // Codigo Postal
  RegimenFiscalReceptor: string
}

export interface CFDIConcepto {
  ClaveProdServ: string
  ClaveUnidad: string
  Unidad: string
  NoIdentificacion?: string
  Cantidad: number
  Descripcion: string
  ValorUnitario: number
  Importe: number
  ObjetoImp: string // "02" for taxed items
  Impuestos?: {
    Traslados: Array<{
      Base: number
      Impuesto: string // "002" for IVA
      TipoFactor: string // "Tasa"
      TasaOCuota: number // 0.160000
      Importe: number
    }>
  }
}

export interface CFDIImpuestos {
  TotalImpuestosTrasladados: number
  Traslados: Array<{
    Base: number
    Impuesto: string
    TipoFactor: string
    TasaOCuota: number
    Importe: number
  }>
}

export interface CFDIComprobante {
  Version: string // "4.0"
  Serie?: string
  Folio?: string
  Fecha: string // ISO format: "2024-01-15T10:30:00"
  FormaPago: string // "03" transferencia
  NoCertificado?: string
  SubTotal: number
  Moneda: string // "MXN"
  TipoCambio?: number
  Total: number
  TipoDeComprobante: string // "I" for Ingreso (income)
  Exportacion: string // "01" for no export
  MetodoPago: string // "PUE" or "PPD"
  LugarExpedicion: string // Codigo Postal of emission
  Emisor: CFDIEmisor
  Receptor: CFDIReceptor
  Conceptos: CFDIConcepto[]
  Impuestos?: CFDIImpuestos
}

export interface TimbradoResponse {
  success: boolean
  uuid?: string
  fechaTimbrado?: string
  cadenaOriginal?: string
  selloSAT?: string
  selloCFD?: string
  noCertificadoSAT?: string
  xmlTimbrado?: string
  pdfBase64?: string
  error?: string
  codigoError?: string
}

export interface CancelacionResponse {
  success: boolean
  acuse?: string
  fechaCancelacion?: string
  estatusUUID?: string
  error?: string
  codigoError?: string
}

export interface ConsultaResponse {
  success: boolean
  estado?: string
  esCancelable?: string
  estatusCancelacion?: string
  error?: string
}

export interface CreditosResponse {
  success: boolean
  creditosDisponibles?: number
  error?: string
}

// Configuration
const FACTURALO_API_KEY = process.env.FACTURALO_API_KEY || ''
const FACTURALO_REST_URL = process.env.FACTURALO_REST_URL || 'https://app.facturaloplus.com/api/rest/servicio'
const FACTURALO_SOAP_URL = process.env.FACTURALO_SOAP_URL || 'https://app.facturaloplus.com/ws/servicio.do'

// Company data from environment
const EMISOR_RFC = process.env.EMISOR_RFC || ''
const EMISOR_NOMBRE = process.env.EMISOR_NOMBRE || ''
const EMISOR_REGIMEN_FISCAL = process.env.EMISOR_REGIMEN_FISCAL || '612'
const EMISOR_CODIGO_POSTAL = process.env.EMISOR_CODIGO_POSTAL || ''

// CSD Certificates (should be stored securely)
const CSD_KEY_PEM = process.env.CSD_KEY_PEM || ''
const CSD_CER_PEM = process.env.CSD_CER_PEM || ''

/**
 * Base64 encode a string
 */
function base64Encode(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64')
}

/**
 * Base64 decode a string
 */
function base64Decode(str: string): string {
  return Buffer.from(str, 'base64').toString('utf-8')
}

/**
 * Format a date for CFDI (ISO 8601 without timezone)
 */
export function formatCFDIDate(date: Date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, '')
}

/**
 * Build a CFDI 4.0 JSON structure for timbrado
 */
export function buildCFDIJSON(data: {
  serie?: string
  folio?: string
  formaPago: string
  metodoPago: string
  subtotal: number
  iva: number
  total: number
  receptor: {
    rfc: string
    nombre: string
    usoCFDI: string
    codigoPostal: string
    regimenFiscal: string
  }
  conceptos: Array<{
    claveProdServ: string
    claveUnidad: string
    unidad: string
    cantidad: number
    descripcion: string
    valorUnitario: number
    importe: number
  }>
}): CFDIComprobante {
  const fecha = formatCFDIDate()

  // Build conceptos with taxes
  const conceptosConImpuestos: CFDIConcepto[] = data.conceptos.map(concepto => ({
    ClaveProdServ: concepto.claveProdServ,
    ClaveUnidad: concepto.claveUnidad,
    Unidad: concepto.unidad,
    Cantidad: concepto.cantidad,
    Descripcion: concepto.descripcion,
    ValorUnitario: Number(concepto.valorUnitario.toFixed(2)),
    Importe: Number(concepto.importe.toFixed(2)),
    ObjetoImp: '02', // Subject to tax
    Impuestos: {
      Traslados: [{
        Base: Number(concepto.importe.toFixed(2)),
        Impuesto: '002', // IVA
        TipoFactor: 'Tasa',
        TasaOCuota: 0.160000,
        Importe: Number((concepto.importe * 0.16).toFixed(2))
      }]
    }
  }))

  return {
    Version: '4.0',
    Serie: data.serie,
    Folio: data.folio,
    Fecha: fecha,
    FormaPago: data.formaPago,
    SubTotal: Number(data.subtotal.toFixed(2)),
    Moneda: 'MXN',
    Total: Number(data.total.toFixed(2)),
    TipoDeComprobante: 'I', // Ingreso
    Exportacion: '01', // No export
    MetodoPago: data.metodoPago,
    LugarExpedicion: EMISOR_CODIGO_POSTAL,
    Emisor: {
      Rfc: EMISOR_RFC,
      Nombre: EMISOR_NOMBRE,
      RegimenFiscal: EMISOR_REGIMEN_FISCAL,
      DomicilioFiscalEmisor: EMISOR_CODIGO_POSTAL
    },
    Receptor: {
      Rfc: data.receptor.rfc,
      Nombre: data.receptor.nombre,
      UsoCFDI: data.receptor.usoCFDI,
      DomicilioFiscalReceptor: data.receptor.codigoPostal,
      RegimenFiscalReceptor: data.receptor.regimenFiscal
    },
    Conceptos: conceptosConImpuestos,
    Impuestos: {
      TotalImpuestosTrasladados: Number(data.iva.toFixed(2)),
      Traslados: [{
        Base: Number(data.subtotal.toFixed(2)),
        Impuesto: '002',
        TipoFactor: 'Tasa',
        TasaOCuota: 0.160000,
        Importe: Number(data.iva.toFixed(2))
      }]
    }
  }
}

/**
 * Call Factura-lo Plus REST API
 */
async function callRestAPI(endpoint: string, body: any): Promise<any> {
  const response = await fetch(`${FACTURALO_REST_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`API Error (${response.status}): ${errorText}`)
  }

  return response.json()
}

/**
 * Call Factura-lo Plus SOAP API using fetch
 */
async function callSoapAPI(operation: string, params: Record<string, string>): Promise<string> {
  // Build SOAP envelope
  const paramElements = Object.entries(params)
    .map(([key, value]) => `<${key}>${escapeXml(value)}</${key}>`)
    .join('')

  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://servicio.ws.cfdi.smsoftware.mx/">
  <soap:Body>
    <ser:${operation}>
      ${paramElements}
    </ser:${operation}>
  </soap:Body>
</soap:Envelope>`

  const response = await fetch(FACTURALO_SOAP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': `"${operation}"`
    },
    body: soapEnvelope
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`SOAP Error (${response.status}): ${errorText}`)
  }

  return response.text()
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Parse SOAP response to extract return value
 */
function parseSoapResponse(xml: string, operation: string): string {
  // Extract the response content between <return> tags
  const returnMatch = xml.match(/<return>([\s\S]*?)<\/return>/i)
  if (returnMatch) {
    // The response might be Base64 encoded
    return returnMatch[1]
  }
  throw new Error(`Could not parse SOAP response for ${operation}`)
}

/**
 * Timbrar (stamp) a CFDI using JSON format
 * This is the main method to stamp an invoice
 */
export async function timbrarJSON(cfdiData: CFDIComprobante): Promise<TimbradoResponse> {
  try {
    // Validate configuration
    if (!FACTURALO_API_KEY) {
      throw new Error('FACTURALO_API_KEY not configured')
    }
    if (!CSD_KEY_PEM || !CSD_CER_PEM) {
      throw new Error('CSD certificates not configured')
    }

    // Convert CFDI to JSON and encode in Base64
    const jsonString = JSON.stringify(cfdiData)
    const jsonB64 = base64Encode(jsonString)

    // Call SOAP API for timbrarJSON3 (version that returns everything)
    const soapResponse = await callSoapAPI('timbrarJSON3', {
      apikey: FACTURALO_API_KEY,
      jsonB64: jsonB64,
      keyPEM: CSD_KEY_PEM,
      cerPEM: CSD_CER_PEM
    })

    // Parse response
    const responseContent = parseSoapResponse(soapResponse, 'timbrarJSON3')

    // The response is Base64 encoded JSON
    let responseData: any
    try {
      const decodedResponse = base64Decode(responseContent)
      responseData = JSON.parse(decodedResponse)
    } catch {
      // If not Base64, try parsing directly
      responseData = JSON.parse(responseContent)
    }

    // Check for errors
    if (responseData.error || responseData.codigoError) {
      return {
        success: false,
        error: responseData.error || responseData.mensaje,
        codigoError: responseData.codigoError
      }
    }

    return {
      success: true,
      uuid: responseData.uuid,
      fechaTimbrado: responseData.fechaTimbrado,
      cadenaOriginal: responseData.cadenaOriginal,
      selloSAT: responseData.selloSAT,
      selloCFD: responseData.selloCFD,
      noCertificadoSAT: responseData.noCertificadoSAT,
      xmlTimbrado: responseData.xml || responseData.xmlTimbrado,
      pdfBase64: responseData.pdf || responseData.pdfBase64
    }
  } catch (error) {
    console.error('Error in timbrarJSON:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al timbrar'
    }
  }
}

/**
 * Cancel a CFDI
 */
export async function cancelarCFDI(data: {
  uuid: string
  rfcReceptor: string
  total: number
  motivo: string // "01", "02", "03", "04"
  folioSustitucion?: string
}): Promise<CancelacionResponse> {
  try {
    if (!FACTURALO_API_KEY) {
      throw new Error('FACTURALO_API_KEY not configured')
    }
    if (!CSD_KEY_PEM || !CSD_CER_PEM) {
      throw new Error('CSD certificates not configured')
    }

    const soapResponse = await callSoapAPI('cancelarPEM', {
      apikey: FACTURALO_API_KEY,
      keyPEM: CSD_KEY_PEM,
      cerPEM: CSD_CER_PEM,
      uuid: data.uuid,
      rfcEmisor: EMISOR_RFC,
      rfcReceptor: data.rfcReceptor,
      total: data.total.toFixed(2),
      motivo: data.motivo,
      folioSustitucion: data.folioSustitucion || ''
    })

    const responseContent = parseSoapResponse(soapResponse, 'cancelarPEM')

    let responseData: any
    try {
      const decodedResponse = base64Decode(responseContent)
      responseData = JSON.parse(decodedResponse)
    } catch {
      responseData = JSON.parse(responseContent)
    }

    if (responseData.error || responseData.codigoError) {
      return {
        success: false,
        error: responseData.error || responseData.mensaje,
        codigoError: responseData.codigoError
      }
    }

    return {
      success: true,
      acuse: responseData.acuse,
      fechaCancelacion: responseData.fechaCancelacion,
      estatusUUID: responseData.estatusUUID
    }
  } catch (error) {
    console.error('Error in cancelarCFDI:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al cancelar'
    }
  }
}

/**
 * Query CFDI status with SAT
 */
export async function consultarEstadoSAT(data: {
  uuid: string
  rfcReceptor: string
  total: number
}): Promise<ConsultaResponse> {
  try {
    if (!FACTURALO_API_KEY) {
      throw new Error('FACTURALO_API_KEY not configured')
    }

    const soapResponse = await callSoapAPI('consultarEstadoSAT', {
      apikey: FACTURALO_API_KEY,
      uuid: data.uuid,
      rfcEmisor: EMISOR_RFC,
      rfcReceptor: data.rfcReceptor,
      total: data.total.toFixed(2)
    })

    const responseContent = parseSoapResponse(soapResponse, 'consultarEstadoSAT')

    let responseData: any
    try {
      const decodedResponse = base64Decode(responseContent)
      responseData = JSON.parse(decodedResponse)
    } catch {
      responseData = JSON.parse(responseContent)
    }

    return {
      success: true,
      estado: responseData.estado,
      esCancelable: responseData.esCancelable,
      estatusCancelacion: responseData.estatusCancelacion
    }
  } catch (error) {
    console.error('Error in consultarEstadoSAT:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al consultar'
    }
  }
}

/**
 * Query available credits
 */
export async function consultarCreditos(): Promise<CreditosResponse> {
  try {
    if (!FACTURALO_API_KEY) {
      throw new Error('FACTURALO_API_KEY not configured')
    }

    const soapResponse = await callSoapAPI('consultarCreditosDisponibles', {
      apikey: FACTURALO_API_KEY
    })

    const responseContent = parseSoapResponse(soapResponse, 'consultarCreditosDisponibles')

    // This usually returns just a number
    const creditos = parseInt(responseContent, 10)

    return {
      success: true,
      creditosDisponibles: isNaN(creditos) ? 0 : creditos
    }
  } catch (error) {
    console.error('Error in consultarCreditos:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al consultar créditos'
    }
  }
}

/**
 * Query a CFDI by UUID
 */
export async function consultarCFDI(uuid: string): Promise<{ success: boolean; xml?: string; error?: string }> {
  try {
    if (!FACTURALO_API_KEY) {
      throw new Error('FACTURALO_API_KEY not configured')
    }

    const soapResponse = await callSoapAPI('consultarCFDI', {
      apikey: FACTURALO_API_KEY,
      uuid: uuid
    })

    const responseContent = parseSoapResponse(soapResponse, 'consultarCFDI')

    return {
      success: true,
      xml: responseContent
    }
  } catch (error) {
    console.error('Error in consultarCFDI:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al consultar CFDI'
    }
  }
}

/**
 * Validate configuration
 */
export function validateConfig(): { isValid: boolean; missing: string[] } {
  const missing: string[] = []

  if (!FACTURALO_API_KEY) missing.push('FACTURALO_API_KEY')
  if (!EMISOR_RFC) missing.push('EMISOR_RFC')
  if (!EMISOR_NOMBRE) missing.push('EMISOR_NOMBRE')
  if (!EMISOR_CODIGO_POSTAL) missing.push('EMISOR_CODIGO_POSTAL')
  if (!CSD_KEY_PEM) missing.push('CSD_KEY_PEM')
  if (!CSD_CER_PEM) missing.push('CSD_CER_PEM')

  return {
    isValid: missing.length === 0,
    missing
  }
}

// Export configuration for debugging
export const config = {
  apiKeySet: !!FACTURALO_API_KEY,
  emisorRfc: EMISOR_RFC,
  emisorNombre: EMISOR_NOMBRE,
  emisorCodigoPostal: EMISOR_CODIGO_POSTAL,
  csdConfigured: !!CSD_KEY_PEM && !!CSD_CER_PEM
}
