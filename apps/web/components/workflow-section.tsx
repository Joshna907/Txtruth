"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { Pulse, BracketsCurly, ShieldCheck } from "@phosphor-icons/react";
import { Reveal } from "@/components/reveal";

const codeSnippets = [
  `import { createTxTruthRecorder,\n  deriveTxTruthPresentation } from "@txtruth/core";\n\nconst recorder = createTxTruthRecorder({\n  cluster: "devnet",\n  requiredCommitment: "confirmed",\n});`,
  `// 01 Start the transaction record\nrecorder.record({\n  type: "transaction_created",\n  at: Date.now(),\n  messageHash: "example-message-hash",\n});`,
  `// 02 Derive only what the evidence supports\nconst ui = deriveTxTruthPresentation(\n  recorder.snapshot()\n);\n\n// No confirmation evidence means no success claim.`,
  `// 03 Present the engine's actual guidance\nconsole.log({\n  title: ui.title,\n  certainty: ui.certainty,\n  feeImpact: ui.feeImpact,\n  retryPolicy: ui.retryPolicy,\n});`,
];

export function WorkflowSection() {
  const containerRef = useRef<HTMLElement>(null);
  const [activeStep, setActiveStep] = useState<number>(1);
  const reduce = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"],
  });

  // width of the line expands from 0 to 100%
  const lineWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section 
      ref={containerRef}
      className="workflow section-shell" 
      id="how-it-works" 
      aria-labelledby="workflow-title"
    >
      <div className="workflow-header-grid">
        <Reveal className="workflow-heading">
          <h2 id="workflow-title">From lifecycle events to honest UI</h2>
        </Reveal>
        <div className="workflow-code-preview">
          <pre>
            <motion.code
              key={activeStep}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {codeSnippets[activeStep]}
            </motion.code>
          </pre>
        </div>
      </div>

      <div className="workflow-steps-wrapper">
        <div className="workflow-track" aria-hidden="true">
          <div className="workflow-line-bg" />
          <motion.div 
            className="workflow-line-fill" 
            style={{ width: reduce ? "100%" : lineWidth }}
          />
        </div>

        <div className="workflow-steps">
          <Reveal className={`workflow-step ${activeStep === 1 ? "active" : ""}`}>
            <button
              type="button"
              className="step-hitbox"
              aria-pressed={activeStep === 1}
              onMouseEnter={() => setActiveStep(1)}
              onFocus={() => setActiveStep(1)}
              onClick={() => setActiveStep(1)}
            >
              <Pulse size={28} weight="duotone" className="step-icon" />
              <span>01</span>
              <h3>Record events</h3>
              <p>Capture wallet, simulation, RPC, and confirmation evidence in order.</p>
            </button>
          </Reveal>

          <Reveal className={`workflow-step ${activeStep === 2 ? "active" : ""}`}>
            <button
              type="button"
              className="step-hitbox"
              aria-pressed={activeStep === 2}
              onMouseEnter={() => setActiveStep(2)}
              onFocus={() => setActiveStep(2)}
              onClick={() => setActiveStep(2)}
            >
              <BracketsCurly size={28} weight="duotone" className="step-icon" />
              <span>02</span>
              <h3>Derive truth</h3>
              <p>Apply deterministic rules without guessing from a timeout or toast.</p>
            </button>
          </Reveal>

          <Reveal className={`workflow-step ${activeStep === 3 ? "active" : ""}`}>
            <button
              type="button"
              className="step-hitbox"
              aria-pressed={activeStep === 3}
              onMouseEnter={() => setActiveStep(3)}
              onFocus={() => setActiveStep(3)}
              onClick={() => setActiveStep(3)}
            >
              <ShieldCheck size={28} weight="duotone" className="step-icon" />
              <span>03</span>
              <h3>Present safe guidance</h3>
              <p>Show the right fee disclosure, retry policy, and verification link.</p>
            </button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
