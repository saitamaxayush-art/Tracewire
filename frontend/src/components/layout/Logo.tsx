import { brand } from '../../config/brand';

/** Square mark: a trace line passing through a gate. Hand-drawn SVG. */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="0.5" y="0.5" width="23" height="23" rx="3" fill="var(--brand-bright)" />
      <path d="M4 15h5l2-6 2 9 2-5h5" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="logo-word">{brand.name}</span>
    </span>
  );
}
