"use client";

import { motion, useReducedMotion } from "motion/react";
import type { Variants } from "motion/react";

export function AnimatedHeadline() {
  const reduce = useReducedMotion();

  const container: Variants = {
    // Keep the headline readable before hydration. Only its position animates.
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const child: Variants = {
    hidden: { opacity: 1, y: reduce ? 0 : 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const text1 = "Your dApp said failed.".split(" ");
  const text2 = "Solana said confirmed.".split(" ");

  return (
    <motion.h1
      initial="hidden"
      animate="visible"
      variants={container}
    >
      {text1.map((word, i) => (
        <motion.span
          key={`t1-${i}`}
          variants={child}
          style={{ display: "inline-block", marginRight: "0.25em" }}
        >
          {word}
        </motion.span>
      ))}
      <span className="highlight" style={{ display: "inline-block" }}>
        {text2.map((word, i) => (
          <motion.span
            key={`t2-${i}`}
            variants={child}
            style={{
              display: "inline-block",
              marginRight: i !== text2.length - 1 ? "0.25em" : "0",
            }}
          >
            {word}
          </motion.span>
        ))}
      </span>
    </motion.h1>
  );
}
