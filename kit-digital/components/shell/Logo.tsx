// Marca propia de Kit Digital (no es el logotipo de ningún otro servicio).
export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="kd-g" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="url(#kd-g)" />
      <path d="M12 12h9a7 7 0 0 1 0 14h-4v2h-5V12Zm5 5v4h4a2 2 0 0 0 0-4h-4Z" fill="#fff" />
      <circle cx="28.5" cy="27.5" r="3.5" fill="#fff" fillOpacity=".85" />
    </svg>
  );
}
