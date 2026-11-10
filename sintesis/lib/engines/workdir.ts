import { mkdtemp, rm, writeFile, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Espacio temporal por operación. Se borra SIEMPRE al terminar (también si hay error).
export class Workdir {
  private constructor(public readonly dir: string) {}

  static async create(): Promise<Workdir> {
    const dir = await mkdtemp(path.join(tmpdir(), "sintesis-"));
    return new Workdir(dir);
  }

  file(name: string): string {
    // Solo nombres generados por el servidor; nunca nombres aportados por el usuario.
    if (!/^[A-Za-z0-9._-]+$/.test(name)) throw new Error("Nombre de archivo interno no válido");
    return path.join(this.dir, name);
  }

  async write(name: string, data: Uint8Array): Promise<string> {
    const p = this.file(name);
    await writeFile(p, data);
    return p;
  }

  async read(name: string): Promise<Buffer> {
    return readFile(this.file(name));
  }

  async size(name: string): Promise<number> {
    return (await stat(this.file(name))).size;
  }

  async cleanup(): Promise<void> {
    await rm(this.dir, { recursive: true, force: true });
  }
}

// Ejecuta una función con su propio espacio temporal y lo elimina al terminar.
export async function withWorkdir<T>(fn: (wd: Workdir) => Promise<T>): Promise<T> {
  const wd = await Workdir.create();
  try {
    return await fn(wd);
  } finally {
    await wd.cleanup().catch(() => undefined);
  }
}
