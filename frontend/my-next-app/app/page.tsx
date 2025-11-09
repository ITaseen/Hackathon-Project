'use client';
import React, { useEffect, useRef, useState } from "react";

type Mode = "work" | "short" | "long";

const WORK_MINUTES = 25;
const SHORT_BREAK_MINUTES = 5;
const LONG_BREAK_MINUTES = 15;

export default function Pomodoro() {
  const [mode, setMode] = useState<Mode>("work");
  const [isRunning, setIsRunning] = useState(false);
  const [remaining, setRemaining] = useState(WORK_MINUTES * 60);
  const [completedSessions, setCompletedSessions] = useState(0);

  const intervalRef = useRef<number | null>(null);

  // Get duration by mode
  function getModeDuration(m: Mode) {
    if (m === "work") return WORK_MINUTES * 60;
    if (m === "short") return SHORT_BREAK_MINUTES * 60;
    return LONG_BREAK_MINUTES * 60;
  }

  // Tick function
  function tick() {
    setRemaining(prev => {
      if (prev <= 1) {
        finishSession();
        return 0;
      }
      return prev - 1;
    });
  }

  // Start timer
  function start() {
    if (isRunning) return;
    setIsRunning(true);
    intervalRef.current = window.setInterval(tick, 1000);
  }

  // Pause timer
  function pause() {
    setIsRunning(false);
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  // Reset timer
  function reset(toMode: Mode = mode) {
    pause();
    setMode(toMode);
    setRemaining(getModeDuration(toMode));
  }

  // Finish session
  function finishSession() {
    if (mode === "work") {
      const newCount = completedSessions + 1;
      setCompletedSessions(newCount);
      const useLong = newCount % 4 === 0;
      const nextMode: Mode = useLong ? "long" : "short";
      setMode(nextMode);
      setRemaining(getModeDuration(nextMode));
      playBeep();
      notify("Work complete", "Time for a break!");
    } else {
      setMode("work");
      setRemaining(getModeDuration("work"));
      playBeep();
      notify("Break complete", "Back to work!");
    }
    pause();
  }

  // Beep sound
  const audioCtxRef = useRef<AudioContext | null>(null);
  function playBeep() {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current!;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(ctx.destination);
      const now = ctx.currentTime;
      g.gain.linearRampToValueAtTime(0.1, now + 0.01);
      o.start(now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      o.stop(now + 0.5);
    } catch {}
  }

  // Notifications
  function notify(title: string, body?: string) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(p => {
        if (p === "granted") new Notification(title, { body });
      });
    }
  }

  // Format time mm:ss
  function formatTime(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  // UI helpers
  const total = getModeDuration(mode);
  const percent = Math.max(0, Math.min(100, Math.round(((total - remaining) / total) * 100)));
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  return (
    <div className="w-full max-w-2xl bg-white/5 backdrop-blur rounded-2xl p-6 shadow-2xl border border-white/5 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pomodoro Timer</h1>
        <div className="text-sm opacity-80">Sessions: {completedSessions}</div>
      </div>

      <div className="mt-6 flex flex-col items-center">
        <div className="relative">
          <svg width="220" height="220" className="-rotate-90">
            <circle cx="110" cy="110" r={radius} strokeWidth="14" stroke="#0f172a" fill="none" />
            <circle
              cx="110"
              cy="110"
              r={radius}
              strokeWidth="14"
              stroke="url(#grad)"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeLinecap="round"
              fill="none"
            >
              <defs>
                <linearGradient id="grad" x1="0" x2="1">
                  <stop offset="0%" stopColor="#fb7185" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </circle>
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-white text-5xl font-mono">{formatTime(remaining)}</div>
            <div className="mt-2 text-sm text-white/80 capitalize">
              {mode === "work" ? "Focus" : mode === "short" ? "Short break" : "Long break"}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          {!isRunning ? (
            <button onClick={start} className="px-5 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-semibold shadow">Start</button>
          ) : (
            <button onClick={pause} className="px-5 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-semibold shadow">Pause</button>
          )}
          <button onClick={() => reset(mode)} className="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white">Reset</button>
          <button onClick={() => setRemaining(0)} className="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white">Skip</button>
        </div>

        <div className="mt-4 text-xs text-white/70">Progress: {percent}%</div>
        <div className="w-full bg-white/6 h-2 rounded-full mt-2 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${percent}%`, background: "linear-gradient(90deg,#fb7185,#f59e0b)" }} />
        </div>
      </div>

      <div className="mt-6 text-xs text-white/60">Built with Next.js + TypeScript + Tailwind</div>
    </div>
  );
}
