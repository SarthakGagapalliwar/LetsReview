"use client";

import confetti from "canvas-confetti";
import type { ReactNode } from "react";
import React, {
  createContext,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";

import { cn } from "@/lib/utils";

interface ConfettiApi {
  fire: (options?: confetti.Options) => void;
}

type ConfettiContextType = ConfettiApi | null;

const ConfettiContext = createContext<ConfettiContextType>(null);

export interface ConfettiProps extends React.ComponentPropsWithoutRef<"canvas"> {
  options?: confetti.Options;
  globalOptions?: confetti.GlobalOptions;
  manualstart?: boolean;
  children?: ReactNode;
}

export interface ConfettiRef {
  fire: (options?: confetti.Options) => void;
}

const Confetti = forwardRef<ConfettiRef, ConfettiProps>(
  (
    {
      options,
      globalOptions = { resize: true, useWorker: true },
      manualstart = false,
      children,
      className,
      ...props
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const confettiRef = useRef<confetti.CreateTypes | null>(null);

    const fire = useCallback(
      (opts: confetti.Options = {}) => {
        confettiRef.current?.({
          ...options,
          ...opts,
        });
      },
      [options],
    );

    const api = useMemo(() => ({ fire }), [fire]);

    useImperativeHandle(ref, () => api, [api]);

    useEffect(() => {
      if (!canvasRef.current) return;

      confettiRef.current = confetti.create(canvasRef.current, globalOptions);

      return () => {
        confettiRef.current?.reset();
      };
    }, [globalOptions]);

    useEffect(() => {
      if (!manualstart) {
        fire();
      }
    }, [manualstart, fire]);

    return (
      <ConfettiContext.Provider value={api}>
        <canvas
          ref={canvasRef}
          className={cn("pointer-events-none", className)}
          {...props}
        />
        {children}
      </ConfettiContext.Provider>
    );
  },
);

Confetti.displayName = "Confetti";

// Star celebration confetti preset
export const fireStarConfetti = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  const randomInRange = (min: number, max: number) =>
    Math.random() * (max - min) + min;

  const interval = window.setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ["#FFD700", "#FFA500", "#FF8C00", "#FFB347", "#FFCC00"],
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ["#FFD700", "#FFA500", "#FF8C00", "#FFB347", "#FFCC00"],
    });
  }, 250);
};

export { Confetti };
