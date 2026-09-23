"use client";

import { useState } from "react";
import { recommendedScenarios, runScenario } from "@txtruth/testkit";
import { ArrowRight, CheckCircle, WarningCircle, XCircle } from "@phosphor-icons/react";
import { outcomeMeta, retryLabel } from "@/lib/presentation";

const shortNames = ["Wallet", "Simulation", "RPC", "Timeout", "Expiry", "Execution", "Success"];

export function ScenarioRail() {
  const [active, setActive] = useState(0);
  const scenario = recommendedScenarios[active];
  const presentation = runScenario(scenario);
  const meta = outcomeMeta(presentation.outcome);
  const StateIcon = meta.tone === "mint" ? CheckCircle : meta.tone === "red" ? XCircle : WarningCircle;

  return (
    <div className="scenario-explorer">
      <div className="scenario-tabs" role="tablist" aria-label="Transaction scenarios">
        {recommendedScenarios.map((item, index) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={active === index}
            aria-controls="scenario-detail"
            className={active === index ? "active" : ""}
            onClick={() => setActive(index)}
            title={item.name}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{shortNames[index] ?? item.name}</strong>
          </button>
        ))}
      </div>
      <div id="scenario-detail" role="tabpanel" className={`scenario-detail tone-${meta.tone}`}>
        <div className="scenario-verdict-content">
          <div className="scenario-kicker">
            <StateIcon size={18} weight="duotone" />
            <span>Case {String(active + 1).padStart(2, "0")} of {String(recommendedScenarios.length).padStart(2, "0")}</span>
          </div>
          <h3>{presentation.title}</h3>
          <p>{presentation.message}</p>
          <div className="scenario-facts">
            <div><span>Evidence</span><strong>{presentation.evidence.length} lifecycle events</strong></div>
            <div><span>Safe next step</span><strong>{retryLabel(presentation.retryPolicy)}</strong></div>
          </div>
          <a href={`/lab?scenario=${scenario.id}`}>Inspect this case <ArrowRight size={16} /></a>
        </div>
        <div className="scenario-event-path">
          <div className="panel-label">Evidence sequence</div>
          <ol className="event-chips">
            {presentation.evidence.slice(0, 5).map((item) => {
              const timedOut = item.event === "confirmation_timed_out";
              const failed = item.event.includes("failed") || item.event === "wallet_rejected";
              const Icon = failed ? XCircle : timedOut ? WarningCircle : CheckCircle;
              const toneClass = failed ? "chip-red" : timedOut ? "chip-amber" : "chip-mint";
              
              return (
                <li className={`event-chip ${toneClass}`} key={`${item.event}-${item.at}`} title={item.summary}>
                  <Icon size={16} weight={failed || timedOut ? "fill" : "duotone"} />
                  <span>{item.event.replaceAll("_", " ")}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
