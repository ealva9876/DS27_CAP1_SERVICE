#!/usr/bin/env node
/**
 * Smoke test against the live MINVU ASMX endpoint.
 * Exit 0 if SOAP returns HTTP 200 and an ICE envelope string.
 */

const ENDPOINT =
  "http://wsminvuni.minvu.cl/WSICEContratistas/ContratistaConstructorDS27.asmx";
const ACTION =
  "http://minvu.WSICE.Contratistas/ObtenerContratistaPorRut";
const RUT = Number(process.argv[2] || "76000000");

const body = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ObtenerContratistaPorRut xmlns="http://minvu.WSICE.Contratistas/">
      <input><Rut>${RUT}</Rut></input>
    </ObtenerContratistaPorRut>
  </soap:Body>
</soap:Envelope>`;

const started = Date.now();
const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: {
    "Content-Type": "text/xml; charset=utf-8",
    SOAPAction: `"${ACTION}"`,
  },
  body,
});
const text = await res.text();
const ms = Date.now() - started;

const hasResult = text.includes("ObtenerContratistaPorRutResult");
const hasIce = text.includes("ICE") || text.includes("&lt;ICE&gt;");

console.log(
  JSON.stringify(
    {
      rut: RUT,
      httpStatus: res.status,
      durationMs: ms,
      hasResult,
      hasIce,
      preview: text.slice(0, 400),
    },
    null,
    2,
  ),
);

if (!res.ok || !hasResult || !hasIce) {
  process.exit(1);
}
