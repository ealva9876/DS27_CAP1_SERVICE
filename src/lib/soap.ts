export const SOAP_ENDPOINT =
  "http://wsminvuni.minvu.cl/WSICEContratistas/ContratistaConstructorDS27.asmx";
export const WSDL_URL = `${SOAP_ENDPOINT}?wsdl`;
export const SOAP_NAMESPACE = "http://minvu.WSICE.Contratistas/";
export const SOAP_ACTION = `${SOAP_NAMESPACE}ObtenerContratistaPorRut`;

export type IceResultado = {
  estado?: string;
  codigo?: string;
  descripcion?: string;
  idRespuesta?: string;
};

export type IceRespuestaRow = Record<string, string>;

export type ParsedIce = {
  resultado: IceResultado;
  entradaUsuario?: string;
  /** RESULTADO under RESPUESTA (OK/NOK), when present outside Table*. */
  respuestaResultado?: string;
  respuestaGlosa?: string;
  filas: IceRespuestaRow[];
  rawInnerXml: string;
};

export type SoapCallResult = {
  ok: boolean;
  httpStatus: number;
  durationMs: number;
  rut: number;
  requestXml: string;
  responseXml: string;
  resultString?: string;
  ice?: ParsedIce;
  error?: string;
};

/** Accepts "12.345.678-9", "12345678-9", or "12345678" and returns numeric body. */
export function parseRutBody(input: string): number | null {
  const cleaned = input.trim().replace(/\./g, "").replace(/\s/g, "");
  const withoutDv = cleaned.includes("-")
    ? cleaned.slice(0, cleaned.lastIndexOf("-"))
    : cleaned.replace(/[kK]$/, "");
  if (!/^\d{1,9}$/.test(withoutDv)) return null;
  const n = Number(withoutDv);
  if (!Number.isInteger(n) || n < 1 || n > 2_147_483_647) return null;
  return n;
}

export function buildSoapRequest(rut: number): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ObtenerContratistaPorRut xmlns="${SOAP_NAMESPACE}">
      <input>
        <Rut>${rut}</Rut>
      </input>
    </ObtenerContratistaPorRut>
  </soap:Body>
</soap:Envelope>`;
}

function tagValue(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : undefined;
}

function unescapeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function extractSoapResultString(responseXml: string): string | undefined {
  const m = responseXml.match(
    /<ObtenerContratistaPorRutResult>([\s\S]*?)<\/ObtenerContratistaPorRutResult>/i,
  );
  if (!m) return undefined;
  return unescapeXmlEntities(m[1]);
}

export function parseIcePayload(innerXml: string): ParsedIce {
  const resultado: IceResultado = {
    estado: tagValue(innerXml, "ESTADO"),
    codigo: tagValue(innerXml, "CODIGO"),
    descripcion: tagValue(innerXml, "DESCRIPCION"),
    idRespuesta: tagValue(innerXml, "ID_RESPUESTA"),
  };

  const entradaUsuario = tagValue(
    tagValue(innerXml, "ENTRADA") ?? "",
    "USUARIO",
  );

  const respuestaBlock = tagValue(innerXml, "RESPUESTA") ?? "";
  const respuestaSinTablas = respuestaBlock.replace(
    /<Table\d*>[\s\S]*?<\/Table\d*>/gi,
    "",
  );
  const respuestaResultado = tagValue(respuestaSinTablas, "RESULTADO");
  const respuestaGlosa = tagValue(respuestaSinTablas, "GLOSA");

  const filas: IceRespuestaRow[] = [];
  const tableRe = /<Table\d*>([\s\S]*?)<\/Table\d*>/gi;
  let match: RegExpExecArray | null;
  while ((match = tableRe.exec(innerXml)) !== null) {
    const block = match[1];
    const row: IceRespuestaRow = {};
    const fieldRe = /<([A-Za-z0-9_]+)>([\s\S]*?)<\/\1>/g;
    let field: RegExpExecArray | null;
    while ((field = fieldRe.exec(block)) !== null) {
      row[field[1]] = field[2].trim();
    }
    if (Object.keys(row).length) filas.push(row);
  }

  return {
    resultado,
    entradaUsuario,
    respuestaResultado,
    respuestaGlosa,
    filas,
    rawInnerXml: innerXml,
  };
}

export async function callObtenerContratistaPorRut(
  rut: number,
): Promise<SoapCallResult> {
  const requestXml = buildSoapRequest(rut);
  const started = Date.now();

  try {
    const res = await fetch(SOAP_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: `"${SOAP_ACTION}"`,
      },
      body: requestXml,
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });

    const responseXml = await res.text();
    const durationMs = Date.now() - started;
    const resultString = extractSoapResultString(responseXml);
    const ice = resultString ? parseIcePayload(resultString) : undefined;

    return {
      ok: res.ok,
      httpStatus: res.status,
      durationMs,
      rut,
      requestXml,
      responseXml,
      resultString,
      ice,
      error: res.ok
        ? undefined
        : `HTTP ${res.status} desde el servicio MINVU`,
    };
  } catch (err) {
    const durationMs = Date.now() - started;
    const message =
      err instanceof Error ? err.message : "Error desconocido al llamar SOAP";
    return {
      ok: false,
      httpStatus: 0,
      durationMs,
      rut,
      requestXml,
      responseXml: "",
      error: message,
    };
  }
}

export async function checkWsdlReachable(): Promise<{
  ok: boolean;
  status: number;
  durationMs: number;
  error?: string;
  hasOperation: boolean;
}> {
  const started = Date.now();
  try {
    const res = await fetch(WSDL_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      durationMs: Date.now() - started,
      hasOperation: text.includes("ObtenerContratistaPorRut"),
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - started,
      hasOperation: false,
      error: err instanceof Error ? err.message : "Error de red",
    };
  }
}
