"use client";

import { useState } from "react";
import { recommendedScenarios, runScenario } from "@txtruth/testkit";
import { ArrowRight, CheckCircle, WarningCircle, XCircle } from "@phosphor-icons/react";
import { outcomeMeta, retryLabel } from "@/lib/presentation";

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
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {item.name}
          </button>
        ))}
      </div>
      <div id="scenario-detail" role="tabpanel" className={`scenario-detail tone-${meta.tone}`}>
        <div className="scenario-verdict">
          <StateIcon size={28} weight="duotone" />
          <div>
            <span>Truthful outcome</span>
            <h3>{presentation.title}</h3>
          </div>
        </div>
        <p>{presentation.message}</p>
        <div className="scenario-facts">
          <div><span>Evidence</span><strong>{presentation.evidence.length} lifecycle events</strong></div>
          <div><span>Safe next step</span><strong>{retryLabel(presentation.retryPolicy)}</strong></div>
        </div>
        <a href={`/lab?scenario=${scenario.id}`}>Inspect this case <ArrowRight size={16} /></a>
      </div>
    </div>
  );
}
