import { NextResponse } from "next/server";
import {
  SOAP_ACTION,
  SOAP_ENDPOINT,
  WSDL_URL,
  checkWsdlReachable,
} from "@/lib/soap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const wsdl = await checkWsdlReachable();
  return NextResponse.json({
    service: "ContratistaConstructorDS27",
    endpoint: SOAP_ENDPOINT,
    wsdl: WSDL_URL,
    soapAction: SOAP_ACTION,
    operation: "ObtenerContratistaPorRut",
    connectivity: wsdl,
  });
}
