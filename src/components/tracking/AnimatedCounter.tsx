"use client";

import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useSpring } from 'framer-motion';

interface AnimatedCounterProps {
  from: number;
  to: number;
  suffix?: string;
  decimals?: number;
}

export function AnimatedCounter({ from, to, suffix = "", decimals = 1 }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(from);
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 200,
  });
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (isInView) {
      motionValue.set(to);
    }
  }, [motionValue, isInView, to]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = `${to > 99 ? '' : '+'}${latest.toFixed(decimals)}${suffix}`;
      }
    });
    return unsubscribe;
  }, [springValue, to, suffix, decimals]);
  
  return <span ref={ref} className="text-4xl font-bold mt-4" />;
}
