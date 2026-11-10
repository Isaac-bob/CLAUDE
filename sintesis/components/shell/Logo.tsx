// Logotipo oficial de Síntesis (archivo del cliente, sin modificar).
export function Logo({ className = "h-10 w-10" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/logo-sintesis.png" alt="" aria-hidden="true" width={187} height={171} className={className} />;
}
