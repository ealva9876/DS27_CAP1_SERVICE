"use client";

import { FormEvent, useEffect, useState } from "react";
import type { SoapCallResult } from "@/lib/soap";

type HealthPayload = {
  service: string;
  endpoint: string;
  wsdl: string;
  soapAction: string;
  operation: string;
  connectivity: {
    ok: boolean;
    status: number;
    durationMs: number;
    hasOperation: boolean;
    error?: string;
  };
};

type Tab = "tabla" | "ice" | "request" | "response";

export default function SoapTester() {
  const [rut, setRut] = useState("76528588");
  const [loading, setLoading] = useState(false);
  const [healthLoading, setHealthLoading] = useState(true);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [result, setResult] = useState<SoapCallResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("tabla");

  async function loadHealth() {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const data = (await res.json()) as HealthPayload;
      setHealth(data);
      if (!data.connectivity.ok) {
        setHealthError(data.connectivity.error ?? "WSDL no alcanzable");
      }
    } catch (err) {
      setHealthError(
        err instanceof Error ? err.message : "No se pudo verificar el WSDL",
      );
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }

  useEffect(() => {
    void loadHealth();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setLoading(true);
    setResult(null);
    setTab("tabla");
    try {
      const res = await fetch("/api/contratista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rut }),
      });
      const data = (await res.json()) as
        | SoapCallResult
        | { error: string };
      if ("error" in data && !("responseXml" in data)) {
        setFormError(data.error || "Error al consultar");
        return;
      }
      setResult(data as SoapCallResult);
      if (data.ice?.filas.length) {
        setTab("tabla");
      } else if (data.resultString) {
        setTab("ice");
      } else {
        setTab("response");
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Error de red al llamar la API",
      );
    } finally {
      setLoading(false);
    }
  }

  const iceOk = result?.ice?.resultado.descripcion?.includes("EXITOSA");
  const negocioOk =
    result?.ice?.respuestaResultado === "OK" ||
    (result?.ice?.filas.some((f) => f.RESULTADO === "OK") ?? false);
  const negocioNok =
    result?.ice?.respuestaResultado === "NOK" ||
    (result?.ice?.filas.some((f) => f.RESULTADO === "NOK") ?? false);
  const glosaNegocio =
    result?.ice?.respuestaGlosa ||
    result?.ice?.filas.find((f) => f.GLOSA)?.GLOSA;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-10 sm:py-14">
      <header className="animate-rise">
        <p className="font-[family-name:var(--font-ibm-plex-mono)] text-[11px] uppercase tracking-[0.22em] text-[var(--ink-muted)]">
          MINVU · WSICE Contratistas
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
          DS27
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--ink-muted)] sm:text-lg">
          Prueba en vivo de{" "}
          <span className="font-[family-name:var(--font-ibm-plex-mono)] text-sm text-[var(--ink)]">
            ObtenerContratistaPorRut
          </span>
          : envía un RUT y revisa el envelope ICE que devuelve el ASMX.
        </p>
      </header>

      <section
        className="animate-rise-delay rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 backdrop-blur-md sm:p-6"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`status-dot inline-block h-2.5 w-2.5 rounded-full ${
                healthLoading
                  ? "bg-[var(--warn)]"
                  : health?.connectivity.ok
                    ? "bg-[var(--ok)]"
                    : "bg-[var(--err)]"
              }`}
            />
            <h2 className="text-sm font-semibold tracking-wide">
              Conectividad WSDL
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void loadHealth()}
            className="font-[family-name:var(--font-ibm-plex-mono)] text-xs text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Reverificar
          </button>
        </div>

        {healthLoading ? (
          <div className="mt-4 space-y-2">
            <div className="skeleton h-3 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
        ) : health ? (
          <dl className="mt-4 grid gap-2 font-[family-name:var(--font-ibm-plex-mono)] text-xs text-[var(--ink-muted)] sm:grid-cols-2">
            <div>
              <dt className="text-[10px] uppercase tracking-wider">Estado</dt>
              <dd className="mt-0.5 text-[var(--ink)]">
                {health.connectivity.ok
                  ? `OK · HTTP ${health.connectivity.status} · ${health.connectivity.durationMs} ms`
                  : healthError ?? "Falló"}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider">Operación</dt>
              <dd className="mt-0.5 text-[var(--ink)]">
                {health.connectivity.hasOperation
                  ? health.operation
                  : "No detectada en WSDL"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[10px] uppercase tracking-wider">Endpoint</dt>
              <dd className="mt-0.5 break-all text-[var(--ink)]">
                {health.endpoint}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-[var(--err)]">
            {healthError ?? "Sin datos de conectividad"}
          </p>
        )}
      </section>

      <section className="animate-rise-delay-2 rounded-2xl border border-[var(--line)] bg-[var(--panel-solid)] p-5 shadow-[0_18px_40px_-28px_rgba(15,42,40,0.45)] sm:p-6">
        <h2 className="text-sm font-semibold tracking-wide">Consultar por RUT</h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          El servicio espera el cuerpo del RUT como entero (sin dígito
          verificador). También acepta formato con puntos y guión.
        </p>

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="sr-only">RUT del contratista</span>
            <input
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              placeholder="Ej. 12.345.678-9"
              autoComplete="off"
              inputMode="numeric"
              className="w-full rounded-xl border border-[var(--line)] bg-white px-4 py-3 font-[family-name:var(--font-ibm-plex-mono)] text-base outline-none ring-[var(--accent)] transition focus:ring-2"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !rut.trim()}
            className="rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Consultando…" : "Invocar SOAP"}
          </button>
        </form>

        {formError ? (
          <p className="mt-3 text-sm text-[var(--err)]" role="alert">
            {formError}
          </p>
        ) : null}

        {loading ? (
          <div className="mt-6 space-y-3" aria-busy="true">
            <div className="skeleton h-4 w-40 rounded" />
            <div className="skeleton h-24 w-full rounded-xl" />
          </div>
        ) : null}

        {result ? (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge
                tone={result.ok ? "ok" : "err"}
                label={
                  result.ok
                    ? `HTTP ${result.httpStatus}`
                    : result.error ?? `HTTP ${result.httpStatus}`
                }
              />
              <Badge tone="neutral" label={`${result.durationMs} ms`} />
              <Badge tone="neutral" label={`RUT ${result.rut}`} />
              {iceOk ? <Badge tone="ok" label="ICE EXITOSA" /> : null}
              {negocioOk ? <Badge tone="ok" label="Negocio OK" /> : null}
              {negocioNok ? (
                <Badge tone="warn" label="Negocio NOK" />
              ) : null}
            </div>

            {result.ice?.resultado.descripcion ? (
              <p className="text-sm text-[var(--ink-muted)]">
                {result.ice.resultado.descripcion}
                {glosaNegocio ? ` · ${glosaNegocio}` : ""}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-1 border-b border-[var(--line)] pb-2">
              {(
                [
                  ["tabla", "Tabla"],
                  ["ice", "XML ICE"],
                  ["request", "Request"],
                  ["response", "Response SOAP"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    tab === id
                      ? "bg-[var(--ink)] text-white"
                      : "text-[var(--ink-muted)] hover:bg-black/5"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "tabla" ? (
              result.ice?.filas.length ? (
                <div className="overflow-x-auto rounded-xl border border-[var(--line)]">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-black/[0.03] font-[family-name:var(--font-ibm-plex-mono)] text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                      <tr>
                        {Object.keys(result.ice.filas[0]).map((k) => (
                          <th key={k} className="px-3 py-2 font-medium">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.ice.filas.map((row, i) => (
                        <tr
                          key={i}
                          className="border-t border-[var(--line)] font-[family-name:var(--font-ibm-plex-mono)] text-xs"
                        >
                          {Object.keys(result.ice!.filas[0]).map((k) => (
                            <td key={k} className="px-3 py-2 align-top">
                              {row[k] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState message="Sin filas Table* en la respuesta ICE. Revisa la pestaña XML ICE." />
              )
            ) : null}

            {tab === "ice" ? (
              <CodeBlock
                code={result.resultString ?? result.ice?.rawInnerXml ?? "(vacío)"}
              />
            ) : null}
            {tab === "request" ? <CodeBlock code={result.requestXml} /> : null}
            {tab === "response" ? (
              <CodeBlock code={result.responseXml || "(sin cuerpo)"} />
            ) : null}
          </div>
        ) : null}
      </section>

      <footer className="pb-6 text-xs text-[var(--ink-muted)]">
        Proxy servidor fijo a{" "}
        <span className="font-[family-name:var(--font-ibm-plex-mono)]">
          wsminvuni.minvu.cl
        </span>
        . No reenvía URLs arbitrarias.
      </footer>
    </div>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: "ok" | "warn" | "err" | "neutral";
}) {
  const colors = {
    ok: "bg-[color-mix(in_srgb,var(--ok)_14%,white)] text-[var(--ok)]",
    warn: "bg-[color-mix(in_srgb,var(--warn)_14%,white)] text-[var(--warn)]",
    err: "bg-[color-mix(in_srgb,var(--err)_14%,white)] text-[var(--err)]",
    neutral: "bg-black/[0.05] text-[var(--ink-muted)]",
  };
  return (
    <span
      className={`rounded-md px-2.5 py-1 font-[family-name:var(--font-ibm-plex-mono)] text-[11px] font-medium ${colors[tone]}`}
    >
      {label}
    </span>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="max-h-[420px] overflow-auto rounded-xl border border-[var(--line)] bg-[#0f2a28] p-4 font-[family-name:var(--font-ibm-plex-mono)] text-[11px] leading-relaxed text-[#d5ebe7]">
      {code}
    </pre>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-[var(--line)] bg-white/50 px-4 py-8 text-center text-sm text-[var(--ink-muted)]">
      {message}
    </p>
  );
}
