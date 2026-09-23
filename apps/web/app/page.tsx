import Link from "next/link";
import { ArrowRight, ArrowSquareOut, ClockCountdown, PenNib, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { recommendedScenarios, runScenario } from "@txtruth/testkit";
import { SiteNav } from "@/components/site-nav";
import { HeroForensic } from "@/components/hero-forensic";
import { ScenarioRail } from "@/components/scenario-rail";
import { WorkflowSection } from "@/components/workflow-section";
import { Reveal } from "@/components/reveal";
import { AnimatedHeadline } from "@/components/animated-headline";

const integrationCode = `import { createTxTruthRecorder,
  deriveTxTruthPresentation } from "@txtruth/core";

const recorder = createTxTruthRecorder({
  cluster: "devnet",
  requiredCommitment: "confirmed",
});

recorder.record({
  type: "transaction_created",
  at: Date.now(),
  messageHash: "your-message-hash",
});
const ui = deriveTxTruthPresentation(recorder.snapshot());`;

export default function HomePage() {
  const scenario = recommendedScenarios.find((item) => item.id === "timeout-then-success")!;
  const presentation = runScenario(scenario);

  return (
    <main id="main-content">
      <SiteNav />
      <section className="hero section-shell" id="product">
        <div className="hero-copy">
          <span className="eyebrow">Solana transaction UX conformance</span>
          <AnimatedHeadline />
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
        
        <div className="problem-grid">
          <div className="problem-card">
            <ClockCountdown size={24} weight="duotone" />
            <h3>Timeout vs Failure</h3>
            <p>A timeout simply means the RPC node gave up waiting. It does not guarantee the transaction failed on-chain.</p>
          </div>
          <div className="problem-card">
            <PenNib size={24} weight="duotone" />
            <h3>Signature vs Confirmation</h3>
            <p>A user signing a transaction only means it was authorized, not that the network has actually confirmed it.</p>
          </div>
          <div className="problem-card">
            <WarningCircle size={24} weight="duotone" />
            <h3>Landed vs Success</h3>
            <p>A transaction can be successfully included in a block but still fail during smart contract execution.</p>
          </div>
        </div>
      </section>

      <section className="scenario-section section-shell" aria-labelledby="scenarios-title">
        <Reveal>
          <span className="eyebrow">The states users actually encounter</span>
          <h2 id="scenarios-title">Seven states developers get wrong</h2>
          <p className="section-intro">Choose a scenario to see the evidence, the honest message, and the safe next action.</p>
        </Reveal>
        <ScenarioRail />
      </section>

      <WorkflowSection />

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
        <div className="footer-main">
          <div className="footer-brand">
            <span className="footer-logo">TxTruth</span>
            <p>The conformance testing framework and evidence engine for Solana transaction UX.</p>
          </div>
          <div className="footer-nav">
            <div className="footer-col">
              <strong>Product</strong>
              <Link href="/lab">Interactive Lab</Link>
              <Link href="/#integration">Core Engine</Link>
              <Link href="/lab">Conformance Testkit</Link>
              <Link href="/lab">Evidence Presentation</Link>
              <a href="https://github.com/Joshna907/Txtruth/tree/main/packages/core" target="_blank" rel="noreferrer">TypeScript SDK <ArrowSquareOut size={12} weight="bold" /></a>
              
              <strong className="spacer">Ecosystem</strong>
              <a href="https://solana.com/docs/clients/javascript" target="_blank" rel="noreferrer">Solana Web3.js <ArrowSquareOut size={12} weight="bold" /></a>
              <a href="https://solana.com/docs/clients/wallet-adapter" target="_blank" rel="noreferrer">Wallet Adapter <ArrowSquareOut size={12} weight="bold" /></a>
            </div>
            <div className="footer-col">
              <strong>Guided Scenarios</strong>
              <Link href="/lab?scenario=wallet-rejection">Wallet Rejection</Link>
              <Link href="/lab?scenario=preflight-failure">Preflight Simulation Failure</Link>
              <Link href="/lab?scenario=timeout-then-success">Confirmation Timeout <span className="badge badge-new">New</span></Link>
              <Link href="/lab?scenario=blockhash-expiry">Blockhash Expiry</Link>
              <Link href="/lab?scenario=rpc-rejection">RPC Rejection <span className="badge badge-new">New</span></Link>
              <Link href="/lab?scenario=execution-failure">Confirmed Execution Failure</Link>
              <Link href="/lab?scenario=confirmed-success">Confirmed Success</Link>
            </div>
            <div className="footer-col">
              <strong>Network</strong>
              <a href="https://explorer.solana.com" target="_blank" rel="noreferrer">Solana Explorer <ArrowSquareOut size={12} weight="bold" /></a>
              <a href="https://faucet.solana.com" target="_blank" rel="noreferrer">Devnet Faucet <ArrowSquareOut size={12} weight="bold" /></a>
              <a href="https://solana.com/docs/core/clusters" target="_blank" rel="noreferrer">RPC Providers <ArrowSquareOut size={12} weight="bold" /></a>
            </div>
            <div className="footer-col">
              <strong>Resources</strong>
              <a href="https://github.com/Joshna907/Txtruth#readme" target="_blank" rel="noreferrer">Documentation <ArrowSquareOut size={12} weight="bold" /></a>
              <a href="https://github.com/Joshna907/Txtruth" target="_blank" rel="noreferrer">Source Code <ArrowSquareOut size={12} weight="bold" /></a>
              <a href="https://solana.com" target="_blank" rel="noreferrer">Solana Foundation <ArrowSquareOut size={12} weight="bold" /></a>
              <a href="https://solana.com/developers" target="_blank" rel="noreferrer">Developer Portal <ArrowSquareOut size={12} weight="bold" /></a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} TxTruth. Open source experimental tool.</p>
        </div>
      </footer>
    </main>
  );
}
