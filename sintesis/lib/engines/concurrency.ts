import { EngineError } from "./errors";

// Limita cuántas operaciones pesadas (LibreOffice, OCR, Chromium…) corren a la vez.
const MAX = Math.max(1, Number(process.env.SINTESIS_MAX_JOBS ?? 2) || 2);
let active = 0;
const queue: { go: () => void }[] = [];

export async function acquireSlot(waitMs = 60_000): Promise<void> {
  if (active < MAX) {
    active++;
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const waiter = {
      go: () => {
        clearTimeout(timer);
        active++;
        resolve();
      },
    };
    const timer = setTimeout(() => {
      const i = queue.indexOf(waiter);
      if (i >= 0) queue.splice(i, 1);
      reject(new EngineError("El servidor está ocupado con otras operaciones. Inténtalo de nuevo en un minuto."));
    }, waitMs);
    queue.push(waiter);
  });
}

export function releaseSlot(): void {
  active = Math.max(0, active - 1);
  const next = queue.shift();
  if (next) next.go();
}
