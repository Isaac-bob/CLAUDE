import { lookup } from "node:dns/promises";
import net from "node:net";
import { EngineError } from "./errors";

// Protección SSRF: el servidor nunca se conecta a redes privadas, loopback ni metadatos de nube.
function isPrivateAddress(ip: string): boolean {
  const v = net.isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split(".").map(Number) as [number, number];
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    );
  }
  if (v === 6) {
    const x = ip.toLowerCase();
    return x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe80") || x.startsWith("::ffff:127.") || x.startsWith("::ffff:10.") || x.startsWith("::ffff:192.168.");
  }
  return true;
}

export async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new EngineError("La dirección web no es válida.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new EngineError("Solo se admiten direcciones http o https.");
  if (url.username || url.password) throw new EngineError("Las direcciones con usuario o contraseña no se admiten.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new EngineError("Esa dirección no está permitida.");
  }
  const addresses = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new EngineError("No se pudo resolver la dirección web.");
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new EngineError("Esa dirección apunta a una red privada y no está permitida.");
  return url;
}
