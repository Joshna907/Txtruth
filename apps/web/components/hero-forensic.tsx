"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check } from "@phosphor-icons/react/Check";
import { ClockCountdown } from "@phosphor-icons/react/ClockCountdown";
import type { TxTruthPresentation } from "@txtruth/core";
import { certaintyLabel, feeLabel, retryLabel } from "@/lib/presentation";
import { TypewriterClaim } from "./typewriter-claim";

const evidenceIcons = [Check, Check, ClockCountdown, Check];

export function HeroForensic({ presentation }: { presentation: TxTruthPresentation }) {
  const reduce = useReducedMotion();
  
  const text1 = presentation.title; // e.g. "Transaction confirmed"
  const text2 = "Observed on-chain at confirmed commitment.";
  
  const [displayedText1, setDisplayedText1] = useState(text1);
  const [displayedText2, setDisplayedText2] = useState(text2);
  const [phase, setPhase] = useState(3);

  useEffect(() => {
    if (reduce) {
      return;
    }

    setDisplayedText1("");
    setDisplayedText2("");
    setPhase(0);

    let timeout: ReturnType<typeof setTimeout>;
    let i = 0;
    let j = 0;

    const speed = 25;

    const typeText2 = () => {
      setPhase(2);
      if (j < text2.length) {
        setDisplayedText2(text2.slice(0, j + 1));
        j++;
        timeout = setTimeout(typeText2, speed);
      } else {
        setPhase(3);
      }
    };

    const typeText1 = () => {
      setPhase(1);
      if (i < text1.length) {
        setDisplayedText1(text1.slice(0, i + 1));
        i++;
        timeout = setTimeout(typeText1, speed);
      } else {
        timeout = setTimeout(typeText2, 150);
      }
    };

    timeout = setTimeout(typeText1, 650);

    return () => clearTimeout(timeout);
  }, [reduce, text1, text2]);

  const evidence = presentation.evidence.slice(-4);
  const timelineStartDelay = reduce ? 0 : 1.6;

  // Precompute the strictly sequential delays for the word-by-word animation
  let currentAccumulatedDelay = timelineStartDelay;
  const sequentialDelays = evidence.map((item) => {
    const titleWords = item.event.replaceAll("_", " ").split(" ").length;
    const descWords = item.summary.split(" ").length;
    
    const nodeDelay = currentAccumulatedDelay;
    const titleDelay = nodeDelay + 0.2;
    const descDelay = titleDelay + (titleWords * 0.08);
    const lineDelay = descDelay + (descWords * 0.08);
    
    // Add breathing room before next step
    currentAccumulatedDelay = lineDelay + 0.4;
    
    return { nodeDelay, titleDelay, descDelay, lineDelay };
  });

  const totalTimelineDuration = currentAccumulatedDelay;

  return (
    <div className="forensic-window" aria-label="Transaction evidence comparison">
      <div className="window-bar">
        <span>Transaction forensic</span>
        <span className="window-signature">SIG 4TxT…111</span>
      </div>
      <div className="claim-comparison">
        <TypewriterClaim />
        <div className="claim good">
          <span>TxTruth verdict</span>
          <strong>
            <Check size={21} weight="bold" style={{ opacity: phase > 0 ? 1 : 0 }} />{" "}
            {displayedText1}
            {phase === 1 && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                style={{ display: "inline-block", width: "8px", height: "1em", backgroundColor: "currentColor", marginLeft: "4px", verticalAlign: "middle" }}
              />
            )}
          </strong>
          <p style={{ minHeight: "1.5em" }}>
            {displayedText2}
            {phase >= 2 && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                style={{ display: "inline-block", width: "6px", height: "1em", backgroundColor: "currentColor", marginLeft: "4px", verticalAlign: "middle" }}
              />
            )}
          </p>
        </div>
      </div>
      <div className="mini-timeline">
        <div className="panel-label">Evidence timeline</div>
        <div className="animated-timeline">
          {evidence.map((item, index) => {
            const Icon = evidenceIcons[index] ?? Check;
            const timedOut = item.event === "confirmation_timed_out";
            
            const titleText = item.event.replaceAll("_", " ");
            const titleWords = titleText.split(" ");
            const descWords = item.summary.split(" ");
            
            const { nodeDelay, titleDelay, descDelay, lineDelay } = sequentialDelays[index];

            return (
              <div className={`mini-event ${timedOut ? "warning" : ""}`} key={`${item.event}-${item.at}`}>
                {/* The connecting line (grows down after text finishes) */}
                <motion.div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 8,
                    width: 1,
                    background: timedOut ? "linear-gradient(var(--mint), var(--amber))" : "var(--mint)",
                    transformOrigin: "top"
                  }}
                  initial={reduce ? { scaleY: 1 } : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: lineDelay, duration: 0.4, ease: "linear" }}
                />
                
                {/* The node (pops in first) */}
                <motion.span 
                  className="event-node"
                  initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: nodeDelay, duration: 0.3, type: "spring", bounce: 0.5 }}
                  style={{ zIndex: 2 }}
                >
                  <Icon size={15} weight="bold" />
                </motion.span>
                
                {/* The text content (word by word) */}
                <div style={{ zIndex: 2, position: "relative" }}>
                  <strong>
                    {titleWords.map((word, i) => (
                      <motion.span
                        key={`title-${i}`}
                        initial={reduce ? { opacity: 1, filter: "blur(0px)" } : { opacity: 0, filter: "blur(4px)" }}
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        transition={{ delay: titleDelay + i * 0.08, duration: 0.2 }}
                        style={{ display: "inline-block", marginRight: "0.27em" }}
                      >
                        {word}
                      </motion.span>
                    ))}
                  </strong>
                  <p>
                    {descWords.map((word, i) => (
                      <motion.span
                        key={`desc-${i}`}
                        initial={reduce ? { opacity: 1, filter: "blur(0px)" } : { opacity: 0, filter: "blur(4px)" }}
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        transition={{ delay: descDelay + i * 0.08, duration: 0.2 }}
                        style={{ display: "inline-block", marginRight: "0.27em" }}
                      >
                        {word}
                      </motion.span>
                    ))}
                  </p>
                </div>
                
                {/* The timestamp */}
                <motion.time
                  initial={reduce ? { opacity: 1 } : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: nodeDelay + 0.2, duration: 0.4 }}
                >
                  t+{item.at}s
                </motion.time>
              </div>
            );
          })}
        </div>
      </div>
      <div className="verdict-summary">
        <motion.div
          initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: totalTimelineDuration + 0.1, duration: 0.35 }}
        >
          <span>Certainty</span><strong>{certaintyLabel(presentation.certainty, presentation.outcome)}</strong>
        </motion.div>
        <motion.div
          initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: totalTimelineDuration + 0.25, duration: 0.35 }}
        >
          <span>Fee</span><strong>{feeLabel(presentation.feeImpact)}</strong>
        </motion.div>
        <motion.div
          initial={reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: totalTimelineDuration + 0.4, duration: 0.35 }}
        >
          <span>Retry</span><strong>{retryLabel(presentation.retryPolicy)}</strong>
        </motion.div>
      </div>
      {presentation.explorerUrl && (
        <motion.div
          className="window-link"
          role="note"
          initial={reduce ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: totalTimelineDuration + 0.65, duration: 0.4 }}
        >
          Simulated scenario · no on-chain signature
        </motion.div>
      )}
    </div>
  );
}
