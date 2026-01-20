"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface HighlighterProps {
  children: React.ReactNode;
  action?: "highlight" | "underline";
  color?: string;
  className?: string;
  delay?: number;
}

export function Highlighter({
  children,
  action = "highlight",
  color = "#FFD700",
  className,
  delay = 0,
}: HighlighterProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
            // Animate the progress from 0 to 100
            let progress = 0;
            const animationDuration = 800;
            const startTime = Date.now();

            const animate = () => {
              const elapsed = Date.now() - startTime;
              progress = Math.min((elapsed / animationDuration) * 100, 100);
              setAnimationProgress(progress);

              if (progress < 100) {
                requestAnimationFrame(animate);
              }
            };
            requestAnimationFrame(animate);
          }, delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  if (action === "underline") {
    return (
      <span ref={ref} className={cn("relative inline-block", className)}>
        {children}
        <span
          className="absolute bottom-0 left-0 h-[2px] rounded-full"
          style={{
            backgroundColor: color,
            width: `${animationProgress}%`,
            transition: "none",
          }}
        />
      </span>
    );
  }

  return (
    <span ref={ref} className={cn("relative inline-block", className)}>
      <span
        className="absolute inset-0 rounded"
        style={{
          background: `linear-gradient(120deg, ${color}50 0%, ${color}30 100%)`,
          clipPath: `inset(0 ${100 - animationProgress}% 0 0)`,
          transition: "none",
        }}
      />
      <span className="relative">{children}</span>
    </span>
  );
}
