import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Brand } from "./brand";

export function SiteNav({ lab = false }: { lab?: boolean }) {
  return (
    <header className="site-header">
      <div className="nav-shell">
        <Brand compact />
        {lab ? (
          <nav className="nav-links" aria-label="Lab navigation">
            <Link href="/">Back to product</Link>
            <Link href="/#integration">Integration</Link>
          </nav>
        ) : (
          <nav className="nav-links" aria-label="Primary navigation">
            <Link href="#product">Product</Link>
            <Link href="/lab">Lab</Link>
            <Link href="#how-it-works">How it works</Link>
            <Link href="#integration">Integration</Link>
            <Link className="nav-cta" href="/lab">
              Run the lab <ArrowUpRight size={17} weight="bold" />
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
