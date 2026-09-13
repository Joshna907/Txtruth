"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowCounterClockwise,
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  CaretDown,
  Check,
  CheckCircle,
  MagnifyingGlass,
  Pause,
  Play,
  SpinnerGap,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import {
  createTxTruthRecorder,
  deriveTxTruthPresentation,
  type TxTruthPresentation,
} from "@txtruth/core";
import {
  recommendedScenarios,
  runCoreConformanceSuite,
  type ScenarioId,
  type TxTruthScenario,
} from "@txtruth/testkit";
import {
  certaintyLabel,
  feeLabel,
  naiveClaim,
  outcomeMeta,
  retryLabel,
  safeJson,
} from "@/lib/presentation";
import { DevnetTransactionPanel } from "@/components/devnet-transaction-panel";

type Playback = "idle" | "running" | "paused" | "complete";
type LivePresentation = Omit<TxTruthPresentation, "feeLamports"> & {
  feeLamports?: string;
};

const defaultConfig = { cluster: "devnet" as const, requiredCommitment: "confirmed" as const };

function isScenarioId(value: string | null): value is ScenarioId {
  return recommendedScenarios.some((scenario) => scenario.id === value);
}

function eventTone(event: string): "mint" | "amber" | "red" | "muted" {
  if (event.includes("failed") || event === "wallet_rejected") return "red";
  if (event.includes("timed_out") || event.includes("height") || event.includes("unavailable")) return "amber";
  if (event.includes("succeeded") || event.includes("accepted") || event.includes("observed")) return "mint";
  return "muted";
}

function formatLamports(value: string): string {
  const lamports = BigInt(value);
  const whole = lamports / 1_000_000_000n;
  const fraction = (lamports % 1_000_000_000n).toString().padStart(9, "0").replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""} SOL`;
}

export function LabShell() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = params.get("scenario");
  const initialId: ScenarioId = isScenarioId(requested) ? requested : "timeout-then-success";
  const initialIndex = recommendedScenarios.findIndex((item) => item.id === initialId);
  const [scenarioIndex, setScenarioIndex] = useState(initialIndex);
  const scenario = recommendedScenarios[scenarioIndex];
  const [visibleCount, setVisibleCount] = useState(scenario.events.length);
  const [playback, setPlayback] = useState<Playback>("complete");
  const [expanded, setExpanded] = useState<number | null>(scenario.events.length - 1);
  const [liveSignature, setLiveSignature] = useState("");
  const [livePresentation, setLivePresentation] = useState<LivePresentation | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const report = useMemo(() => runCoreConformanceSuite(), []);

  const presentation = useMemo(() => {
    const recorder = createTxTruthRecorder(defaultConfig);
    scenario.events.slice(0, visibleCount).forEach((event) => recorder.record(event));
    return deriveTxTruthPresentation(recorder.snapshot());
  }, [scenario, visibleCount]);

  const meta = outcomeMeta(presentation.outcome);
  const naive = naiveClaim(presentation.outcome);
  const visibleEvents = scenario.events.slice(0, visibleCount);

  const selectScenario = useCallback((next: TxTruthScenario, index: number) => {
    setScenarioIndex(index);
    setVisibleCount(next.events.length);
    setPlayback("complete");
    setExpanded(next.events.length - 1);
    const query = new URLSearchParams(params.toString());
    query.set("scenario", next.id);
    router.replace(`${pathname}?${query.toString()}`, { scroll: false });
  }, [params, pathname, router]);

  const run = useCallback(() => {
    setVisibleCount(0);
    setExpanded(null);
    setPlayback("running");
  }, []);

  const replay = useCallback(() => {
    setVisibleCount(0);
    setExpanded(null);
    setPlayback("running");
  }, []);

  const togglePause = useCallback(() => {
    setPlayback((current) => current === "running" ? "paused" : current === "paused" ? "running" : current);
  }, []);

  const previous = useCallback(() => {
    setPlayback("paused");
    setVisibleCount((count) => Math.max(0, count - 1));
    setExpanded(null);
  }, []);

  const next = useCallback(() => {
    setPlayback("paused");
    setVisibleCount((count) => Math.min(scenario.events.length, count + 1));
  }, [scenario.events.length]);

  useEffect(() => {
    if (playback !== "running") return;
    const timer = window.setInterval(() => {
      setVisibleCount((count) => {
        if (count >= scenario.events.length) {
          window.clearInterval(timer);
          setPlayback("complete");
          setExpanded(scenario.events.length - 1);
          return count;
        }
        return count + 1;
      });
    }, 520);
    return () => window.clearInterval(timer);
  }, [playback, scenario.events.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === " ") {
        event.preventDefault();
        if (playback === "idle" || playback === "complete") run();
        else togglePause();
      }
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
      if (event.key.toLowerCase() === "r") replay();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [next, playback, previous, replay, run, togglePause]);

  const inspectSignature = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLiveLoading(true);
    setLiveError(null);
    setLivePresentation(null);
    try {
      const response = await fetch("/api/inspect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ signature: liveSignature.trim(), cluster: "devnet" }),
      });
      const body = (await response.json()) as {
        error?: string;
        presentation?: LivePresentation;
      };
      if (!response.ok || !body.presentation) {
        throw new Error(body.error ?? "Unable to inspect this transaction.");
      }
      setLivePresentation(body.presentation);
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : "Unable to inspect this transaction.");
    } finally {
      setLiveLoading(false);
    }
  };

  const VerdictIcon = meta.tone === "mint" ? CheckCircle : meta.tone === "red" ? XCircle : WarningCircle;

  return (
    <div className="lab-shell">
      <section className="conformance-banner" aria-label="Conformance report">
        <CheckCircle size={38} weight="duotone" />
        <div><span>Run-all conformance</span><strong>{report.results.filter((result) => result.passed).length} / {report.results.length} passed</strong></div>
        <p>Every guided scenario matches the outcome derived by the current TxTruth engine.</p>
        <span className="report-status">Schema v{report.schemaVersion}</span>
      </section>

      <section className="live-inspector" aria-labelledby="live-inspector-title">
        <div className="live-inspector-copy">
          <span>Live Devnet evidence</span>
          <h2 id="live-inspector-title">Inspect a real transaction signature</h2>
          <p>Read-only Devnet RPC lookup. No wallet connection, signing, or private key required.</p>
        </div>
        <form className="live-inspector-form" onSubmit={inspectSignature}>
          <label htmlFor="live-signature">Transaction signature</label>
          <div>
            <input
              id="live-signature"
              name="signature"
              value={liveSignature}
              onChange={(event) => setLiveSignature(event.target.value)}
              placeholder="Paste a Solana transaction signature…"
              autoComplete="off"
              spellCheck={false}
              required
            />
            <button type="submit" disabled={liveLoading}>
              {liveLoading ? <SpinnerGap className="spin" size={17} /> : <MagnifyingGlass size={17} />}
              {liveLoading ? "Inspecting…" : "Inspect"}
            </button>
          </div>
        </form>
        <div className="live-inspector-result" aria-live="polite">
          {liveError && <p className="live-error"><WarningCircle size={18} /> {liveError}</p>}
          {livePresentation && (() => {
            const liveMeta = outcomeMeta(livePresentation.outcome);
            return (
              <div className={`live-verdict tone-${liveMeta.tone}`}>
                <div>
                  <span>{liveMeta.label}</span>
                  <strong>{livePresentation.title}</strong>
                  <p>{livePresentation.message}</p>
                </div>
                <dl>
                  <div><dt>Certainty</dt><dd>{certaintyLabel(livePresentation.certainty)}</dd></div>
                  <div><dt>Fee</dt><dd>{livePresentation.feeLamports ? formatLamports(livePresentation.feeLamports) : feeLabel(livePresentation.feeImpact)}</dd></div>
                  <div><dt>Retry</dt><dd>{retryLabel(livePresentation.retryPolicy)}</dd></div>
                </dl>
                {livePresentation.explorerUrl && (
                  <a href={livePresentation.explorerUrl} target="_blank" rel="noreferrer">
                    Verify on Explorer <ArrowSquareOut size={15} />
                  </a>
                )}
              </div>
            );
          })()}
        </div>
      </section>

      <DevnetTransactionPanel />

      <div className="lab-workspace">
        <aside className="scenario-nav" aria-label="Guided scenarios">
          <div className="lab-panel-title">Guided scenarios</div>
          <div className="scenario-nav-list">
            {recommendedScenarios.map((item, index) => {
              const active = index === scenarioIndex;
              return (
                <button key={item.id} className={active ? "active" : ""} onClick={() => selectScenario(item, index)}>
                  <span>{index + 1}</span>
                  <div><strong>{item.name}</strong><small>{item.expectedOutcome.replaceAll("_", " ")}</small></div>
                  <Check size={16} weight="bold" />
                </button>
              );
            })}
          </div>
          <div className="keyboard-help">
            <span>Keyboard</span>
            <p><kbd>Space</kbd> Run or pause</p>
            <p><kbd>←</kbd><kbd>→</kbd> Step events</p>
            <p><kbd>R</kbd> Replay</p>
          </div>
        </aside>

        <section className="evidence-workspace" aria-label={`${scenario.name} evidence`}>
          <div className="workspace-heading">
            <div><span>Scenario</span><h1>{scenario.name}</h1></div>
            <span className={`playback-state ${playback}`}>{playback}</span>
          </div>
          <div className="playback-controls" aria-label="Playback controls">
            <button className="control-primary" onClick={run}><Play size={16} weight="fill" /> Run</button>
            <button onClick={togglePause} disabled={playback === "idle" || playback === "complete"}><Pause size={16} weight="fill" /> {playback === "paused" ? "Resume" : "Pause"}</button>
            <button onClick={replay}><ArrowCounterClockwise size={17} /> Replay</button>
            <span className="control-spacer" />
            <button onClick={previous} disabled={visibleCount === 0}><ArrowLeft size={17} /> Previous</button>
            <button onClick={next} disabled={visibleCount === scenario.events.length}>Next <ArrowRight size={17} /></button>
          </div>

          <div className="timeline" aria-live="polite">
            {visibleEvents.length === 0 ? (
              <div className="timeline-empty">
                <Play size={28} />
                <strong>Ready to inspect</strong>
                <p>Run the scenario to reveal each lifecycle event in sequence.</p>
              </div>
            ) : visibleEvents.map((event, index) => {
              const tone = eventTone(event.type);
              const isExpanded = expanded === index;
              return (
                <article className={`timeline-event tone-${tone}`} key={`${event.type}-${event.at}`}>
                  <button className="event-summary" aria-expanded={isExpanded} onClick={() => setExpanded(isExpanded ? null : index)}>
                    <span className="event-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="timeline-node" />
                    <time>t+{event.at}s</time>
                    <strong>{event.type}</strong>
                    <span className="event-source">{event.type.includes("wallet") ? "wallet" : event.type.includes("simulation") ? "preflight" : "txtruth-core"}</span>
                    <CaretDown className={isExpanded ? "open" : ""} size={16} />
                  </button>
                  {isExpanded && (
                    <div className="event-detail">
                      <p>{presentation.evidence.find((item) => item.at === event.at)?.summary ?? "Lifecycle evidence recorded."}</p>
                      <pre><code>{safeJson(event)}</code></pre>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <div className="timeline-footer">
            <span>{visibleCount} of {scenario.events.length} events</span>
            <span>{playback === "running" ? "Auto-advancing" : "Playback not advancing"}</span>
          </div>
        </section>

        <aside className={`verdict-panel tone-${meta.tone}`} aria-label="TxTruth verdict">
          <div className="lab-panel-title">Verdict</div>
          <div className="verdict-heading">
            <VerdictIcon size={40} weight="duotone" />
            <div><h2>{presentation.title}</h2><p>{presentation.message}</p></div>
          </div>
          <dl className="verdict-facts">
            <div><dt>Certainty</dt><dd>{certaintyLabel(presentation.certainty)}</dd></div>
            <div><dt>Fee</dt><dd>{feeLabel(presentation.feeImpact)}</dd></div>
            <div><dt>Retry</dt><dd>{retryLabel(presentation.retryPolicy)}</dd></div>
          </dl>
          {presentation.signature && (
            <div className="signature-block">
              <span>Simulated signature</span>
              <code>{presentation.signature.slice(0, 18)}…{presentation.signature.slice(-7)}</code>
              <small>Guided scenario data only. It is not an on-chain transaction.</small>
            </div>
          )}
          <div className="truth-comparison">
            <span>How this compares</span>
            <div className="naive"><small>What a naive dApp might say</small><strong><XCircle size={20} /> {naive.title}</strong><p>{naive.detail}</p></div>
            <div className="proven"><small>What the evidence proves</small><strong><VerdictIcon size={20} /> {presentation.title}</strong><p>{certaintyLabel(presentation.certainty)}</p></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
