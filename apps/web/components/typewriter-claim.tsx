"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react/X";

export function TypewriterClaim() {
  const reduce = useReducedMotion();
  
  const text1 = "Transaction failed";
  const text2 = "Timeout waiting for confirmation.";
  
  // Full text is the server-rendered fallback, so a slow dev compile never
  // leaves this panel looking empty. Hydration progressively enhances it.
  const [displayedText1, setDisplayedText1] = useState(text1);
  const [displayedText2, setDisplayedText2] = useState(text2);
  const [phase, setPhase] = useState(3); // 0: hidden, 1: typing 1, 2: typing 2, 3: done

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

    timeout = setTimeout(typeText1, 150);

    return () => clearTimeout(timeout);
  }, [reduce]);

  return (
    <div className="claim bad" style={{ minHeight: "107px" }}>
      <span>Naive app claim</span>
      <strong>
        <X size={21} weight="bold" style={{ opacity: phase > 0 ? 1 : 0 }} />{" "}
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
  );
}
