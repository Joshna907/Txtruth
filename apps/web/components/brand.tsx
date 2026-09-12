import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/" aria-label="TxTruth home">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
      </span>
      <span>TxTruth</span>
      {!compact && <span className="brand-sub">Transaction UX, proven</span>}
    </Link>
  );
}
