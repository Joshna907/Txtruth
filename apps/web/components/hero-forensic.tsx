import {
  ArrowSquareOut,
  Check,
  ClockCountdown,
  X,
} from "@phosphor-icons/react/dist/ssr";
import type { TxTruthPresentation } from "@txtruth/core";
import { certaintyLabel, feeLabel, retryLabel } from "@/lib/presentation";

const evidenceIcons = [Check, Check, ClockCountdown, Check];

export function HeroForensic({ presentation }: { presentation: TxTruthPresentation }) {
  const evidence = presentation.evidence.slice(-4);

  return (
    <div className="forensic-window" aria-label="Transaction evidence comparison">
      <div className="window-bar">
        <span>Transaction forensic</span>
        <span className="window-signature">SIG 4TxT...111</span>
      </div>
      <div className="claim-comparison">
        <div className="claim bad">
          <span>Naive app claim</span>
          <strong><X size={21} weight="bold" /> Transaction failed</strong>
          <p>Timeout waiting for confirmation.</p>
        </div>
        <div className="claim good">
          <span>TxTruth verdict</span>
          <strong><Check size={21} weight="bold" /> {presentation.title}</strong>
          <p>Observed on-chain at confirmed commitment.</p>
        </div>
      </div>
      <div className="mini-timeline">
        <div className="panel-label">Evidence timeline</div>
        {evidence.map((item, index) => {
          const Icon = evidenceIcons[index] ?? Check;
          const timedOut = item.event === "confirmation_timed_out";
          return (
            <div className={`mini-event ${timedOut ? "warning" : ""}`} key={`${item.event}-${item.at}`}>
              <span className="event-node"><Icon size={15} weight="bold" /></span>
              <div>
                <strong>{item.event.replaceAll("_", " ")}</strong>
                <p>{item.summary}</p>
              </div>
              <time>t+{item.at}s</time>
            </div>
          );
        })}
      </div>
      <div className="verdict-summary">
        <div><span>Certainty</span><strong>{certaintyLabel(presentation.certainty)}</strong></div>
        <div><span>Fee</span><strong>{feeLabel(presentation.feeImpact)}</strong></div>
        <div><span>Retry</span><strong>{retryLabel(presentation.retryPolicy)}</strong></div>
      </div>
      {presentation.explorerUrl && (
        <a className="window-link" href={presentation.explorerUrl} target="_blank" rel="noreferrer">
          Verify on Solana Explorer <ArrowSquareOut size={15} />
        </a>
      )}
    </div>
  );
}
