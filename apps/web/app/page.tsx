import Link from "next/link";
import {
  ArrowRight,
  BracketsCurly,
  Pulse,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import { recommendedScenarios, runScenario } from "@txtruth/testkit";
import { SiteNav } from "@/components/site-nav";
import { HeroForensic } from "@/components/hero-forensic";
import { ScenarioRail } from "@/components/scenario-rail";
import { Reveal } from "@/components/reveal";

const integrationCode = `import { createTxTruthRecorder,
  deriveTxTruthPresentation } from "@txtruth/core";

const recorder = createTxTruthRecorder({
  cluster: "devnet",
  requiredCommitment: "confirmed",
});

recorder.record(event);
const ui = deriveTxTruthPresentation(recorder.snapshot());`;

export default function HomePage() {
  const scenario = recommendedScenarios.find((item) => item.id === "timeout-then-success")!;
  const presentation = runScenario(scenario);

  return (
    <main>
      <SiteNav />
      <section className="hero section-shell" id="product">
        <div className="hero-copy">
          <span className="eyebrow">Solana transaction UX conformance</span>
          <h1>Your dApp said failed. <span>Solana said confirmed.</span></h1>
          <p>Test whether your transaction UI tells the truth before users find out.</p>
          <div className="hero-actions">
            <Link className="button primary" href="/lab">Run the truth test <ArrowRight size={18} weight="bold" /></Link>
            <Link className="button secondary" href="#integration">View integration</Link>
          </div>
        </div>
        <HeroForensic presentation={presentation} />
      </section>

      <section className="problem-statement section-shell">
        <p>A timeout is not a failure. A signature is not a confirmation. A landed transaction can still fail during execution.</p>
        <span>TxTruth keeps those states separate.</span>
      </section>

      <section className="scenario-section section-shell" aria-labelledby="scenarios-title">
        <Reveal>
          <span className="eyebrow">The states users actually encounter</span>
          <h2 id="scenarios-title">Seven states developers get wrong</h2>
          <p className="section-intro">Choose a scenario to see the evidence, the honest message, and the safe next action.</p>
        </Reveal>
        <ScenarioRail />
      </section>

      <section className="workflow section-shell" id="how-it-works" aria-labelledby="workflow-title">
        <Reveal className="workflow-heading">
          <h2 id="workflow-title">From lifecycle events to honest UI</h2>
        </Reveal>
        <div className="workflow-line" aria-hidden="true" />
        <div className="workflow-steps">
          <Reveal className="workflow-step">
            <Pulse size={28} weight="duotone" />
            <span>01</span>
            <h3>Record events</h3>
            <p>Capture wallet, simulation, RPC, and confirmation evidence in order.</p>
          </Reveal>
          <Reveal className="workflow-step">
            <BracketsCurly size={28} weight="duotone" />
            <span>02</span>
            <h3>Derive truth</h3>
            <p>Apply deterministic rules without guessing from a timeout or toast.</p>
          </Reveal>
          <Reveal className="workflow-step">
            <ShieldCheck size={28} weight="duotone" />
            <span>03</span>
            <h3>Present safe guidance</h3>
            <p>Show the right fee disclosure, retry policy, and verification link.</p>
          </Reveal>
        </div>
      </section>

      <section className="integration section-shell" id="integration" aria-labelledby="integration-title">
        <div className="integration-copy">
          <span className="eyebrow">A small API with a strict opinion</span>
          <h2 id="integration-title">Your UI renders the verdict. TxTruth proves it.</h2>
          <p>The same tested engine behind the lab turns lifecycle evidence into one exhaustive presentation model.</p>
          <Link className="text-link" href="/lab">Open the working lab <ArrowRight size={16} /></Link>
        </div>
        <pre className="code-window" aria-label="TxTruth TypeScript integration example"><code>{integrationCode}</code></pre>
      </section>

      <section className="closing section-shell">
        <div>
          <span>Built for Solana transaction reality</span>
          <h2>Make every transaction message defensible.</h2>
        </div>
        <Link className="button primary" href="/lab">Test all seven scenarios <ArrowRight size={18} weight="bold" /></Link>
      </section>

      <footer className="footer section-shell">
        <span>TxTruth</span>
        <p>Transaction UX should be based on evidence.</p>
        <Link href="/lab">Interactive lab</Link>
      </footer>
    </main>
  );
}
