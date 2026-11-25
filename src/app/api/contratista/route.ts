import { NextRequest, NextResponse } from "next/server";
import { callObtenerContratistaPorRut, parseRutBody } from "@/lib/soap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "JSON inválido. Envía { \"rut\": \"12345678\" }." },
      { status: 400 },
    );
  }

  const raw =
    typeof body === "object" && body !== null && "rut" in body
      ? String((body as { rut: unknown }).rut)
      : "";

  const rut = parseRutBody(raw);
  if (rut === null) {
    return NextResponse.json(
      {
        error:
          "RUT inválido. Usa el cuerpo numérico (sin DV), por ejemplo 12345678 o 12.345.678-9.",
      },
      { status: 400 },
    );
  }

  const result = await callObtenerContratistaPorRut(rut);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
