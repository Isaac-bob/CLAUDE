import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { EngineError, EngineMissingError } from "./errors";

const execFileP = promisify(execFile);

// Ejecuta un binario SIN shell: los argumentos nunca se interpretan como comandos.
export async function run(
  cmd: string,
  args: string[],
  opts: { cwd?: string; timeoutMs?: number; env?: Record<string, string> } = {},
): Promise<{ stdout: string; stderr: string }> {
  try {
    const r = await execFileP(cmd, args, {
      cwd: opts.cwd,
      timeout: opts.timeoutMs ?? 180_000,
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, ...(opts.env ?? {}) },
    });
    return { stdout: r.stdout.toString(), stderr: r.stderr.toString() };
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stderr?: Buffer | string; killed?: boolean; signal?: string };
    if (e.code === "ENOENT") throw new EngineMissingError(`Motor no instalado en el servidor: ${path.basename(cmd)}.`);
    if (e.killed || e.signal === "SIGTERM") throw new EngineError("La operación tardó demasiado y se canceló. Prueba con un archivo más pequeño.");
    const detail = String(e.stderr ?? e.message ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(-2)
      .join(" ")
      .slice(0, 300);
    throw new EngineError(`No se pudo completar la operación${detail ? `: ${detail}` : "."}`);
  }
}

// Comprueba si un binario existe en el PATH del servidor.
export async function hasBinary(name: string): Promise<boolean> {
  try {
    await run("which", [name], { timeoutMs: 5000 });
    return true;
  } catch {
    return false;
  }
}

export const PYTHON = process.env.SINTESIS_PYTHON ?? "/opt/sintesis-venv/bin/python";
export const PY_DIR = path.resolve(process.cwd(), "python");

export async function runPython(script: string, args: string[], opts: { cwd?: string; timeoutMs?: number } = {}) {
  return run(PYTHON, [path.join(PY_DIR, script), ...args], opts);
}
