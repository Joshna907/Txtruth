import { Suspense } from "react";
import { SiteNav } from "@/components/site-nav";
import { LabShell } from "@/components/lab-shell";

export default function LabPage() {
  return (
    <main className="lab-page">
      <SiteNav lab />
      <Suspense fallback={<div className="lab-loading">Preparing transaction evidence...</div>}>
        <LabShell />
      </Suspense>
    </main>
  );
}
