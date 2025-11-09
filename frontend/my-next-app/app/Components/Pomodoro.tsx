"use client";
import React, { useEffect, useRef, useState } from "react";

type Mode = "work" | "break";

const WORK_MINUTES = .5;

export default function Pomodoro() {
  // NEW: user settings
  const [studyHours, setStudyHours] = useState<number>(1); // min 1
  const [userBreakMinutes, setUserBreakMinutes] = useState<number>(5); // 5–30
  // pomodoro.tsx

const [money, setMoney] = useState(1500); // starting balance
const REWARD_PER_CYCLE = 200;
const PENALTY_PER_CYCLE = 100;


  // timer state
  const [mode, setMode] = useState<Mode>("work");
  const [isRunning, setIsRunning] = useState(false);
  const [remaining, setRemaining] = useState(WORK_MINUTES * 60);
  const [totalStudySecondsLeft, setTotalStudySecondsLeft] = useState(
    studyHours * 60 * 60
  );

  const intervalRef = useRef<number | null>(null);

  // helper to start interval
  function startInterval() {
    if (intervalRef.current !== null) return;
    intervalRef.current = window.setInterval(tick, 1000);
  }

  function clearIntervalRef() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  // when user hits Start
  function start() {
    // initialize total study time based on chosen hours
    const total = Math.max(1, studyHours) * 60 * 60;
    setTotalStudySecondsLeft(total);
    setMode("work");
    setRemaining(WORK_MINUTES * 60);
    setIsRunning(true);
    startInterval();
  }

  // pause button
  function pause() {
    setIsRunning(false);
    clearIntervalRef();
  }

  // reset to current mode
  function reset(toMode: Mode = mode) {
    pause();
    setMode(toMode);
    setRemaining(getModeDuration(toMode));
    // don't reset total study here so user doesn't lose progress
  }

  // duration for modes
  function getModeDuration(m: Mode) {
    if (m === "work") return WORK_MINUTES * 60;
    return userBreakMinutes * 60; // user-chosen break
  }

  // main tick
  function tick() {
    setRemaining((prev) => {
      if (prev <= 1) {
        finishSession();
        return 0;
      }
      return prev - 1;
    });

    // only count down total study time during WORK
    if (mode === "work") {
      setTotalStudySecondsLeft((prev) => {
        const next = prev - 1;
        return next > 0 ? next : 0;
      });
    }
    if (mode === "work") {
        setMoney((prev) => prev + REWARD_PER_CYCLE);
    }

  }

  // when a block ends
  function finishSession() {
    if (mode === "work") {
      // finished a 25-min focus
      const nextTotal = totalStudySecondsLeft - WORK_MINUTES * 60;

      if (nextTotal <= 0) {
        // study session fully done
        setTotalStudySecondsLeft(0);
        setMode("work");
        setRemaining(0);
        playBeep();
        notify("Study complete", "You finished your session 🎉");
        pause();
        return;
      }

      // otherwise go to user-chosen break
      setTotalStudySecondsLeft(nextTotal);
      setMode("break");
      setRemaining(userBreakMinutes * 60);
      playBeep();
      notify("Work complete", "Time for a break");
    } else {
      // break finished → go back to work
      setMode("work");
      setRemaining(WORK_MINUTES * 60);
      playBeep();
      notify("Break complete", "Back to focus");
    }
  }

  // cleanup on unmount
  useEffect(() => {
    return () => clearIntervalRef();
  }, []);

  // beep sound
  const audioCtxRef = useRef<AudioContext | null>(null);
  function playBeep() {
    try {
      if (!audioCtxRef.current)
        audioCtxRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
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

  // notifications
  function notify(title: string, body?: string) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification(title, { body });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((p) => {
        if (p === "granted") new Notification(title, { body });
      });
    }
  }

  // format mm:ss
  function formatTime(sec: number) {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  }

  // progress for current block
  const totalCurrent = getModeDuration(mode);
  const percent = Math.max(
    0,
    Math.min(100, Math.round(((totalCurrent - remaining) / totalCurrent) * 100))
  );
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  // options for break length 5–30
  const breakOptions = [5, 10, 15, 20, 25, 30];

  return (
    <div className="flex items-center justify-center min-h-screen min-w-screen bg-cover bg-center bg-fixed" style={{ backgroundImage: "url('/monopoly-board-game-3dcjb0g7y2c0n5d0.jpg')" }}>
        <div className="w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-white/5 text-white bg-black">
       <div className="flex items-center justify-between">
  <h1 className="text-2xl font-semibold">Stay Locked – Session</h1>
  <div className="flex items-center gap-4 text-sm opacity-80">
    <span>Study left: {Math.ceil(totalStudySecondsLeft / 60)} min</span>
    <span className="bg-green-500/20 border border-green-400/40 px-3 py-1 rounded-full text-green-200 font-mono">
      ${money}
    </span>
  </div>
</div>


        {/* show settings when not running */}
        {!isRunning && (
            <div className="mt-4 flex gap-4 flex-wrap">
            <div>
    <label className="text-xs block mb-1">Study duration (hours)</label>
    <select
        value={studyHours}
        onChange={(e) => setStudyHours(Number(e.target.value))}
        className="bg-white/10 rounded px-2 py-1"
    >
        {[1, 2, 3, 4, 5, 6, 7, 8].map((hr) => (
        <option key={hr} value={hr}>
            {hr} hour{hr > 1 ? "s" : ""}
        </option>
        ))}
    </select>
    </div>

            <div>
                <label className="text-xs block mb-1">
                Break length (5–30 min)
                </label>
                <select
                value={userBreakMinutes}
                onChange={(e) => setUserBreakMinutes(Number(e.target.value))}
                className="bg-white/10 rounded px-2 py-1"
                >
                {breakOptions.map((m) => (
                    <option key={m} value={m}>
                    {m} min
                    </option>
                ))}
                </select>
            </div>
            </div>
        )}

        <div className="mt-6 flex flex-col items-center">
            <div className="relative">
            <svg width="220" height="220" className="-rotate-90">
                <circle
                cx="110"
                cy="110"
                r={radius}
                strokeWidth="14"
                stroke="#0f172a"
                fill="none"
                />
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
                <div className="text-white text-5xl font-mono">
                {formatTime(remaining)}
                </div>
                <div className="mt-2 text-sm text-white/80 capitalize">
                {mode === "work" ? "Focus" : "Break"}
                </div>
            </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
            {!isRunning ? (
                <button
                onClick={start}
                className="px-5 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-semibold shadow"
                >
                Start
                </button>
            ) : (
                <button
                onClick={pause}
                className="px-5 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-semibold shadow"
                >
                Pause
                </button>
            )}
            <button
                onClick={() => reset(mode)}
                className="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
            >
                Reset
            </button>
            <button
                onClick={() => setRemaining(0)}
                className="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
            >
                Skip
            </button>
            </div>

            <div className="mt-4 text-xs text-white/70">Progress: {percent}%</div>
            <div className="w-full bg-white/6 h-2 rounded-full mt-2 overflow-hidden">
            <div
                className="h-full rounded-full"
                style={{
                width: `${percent}%`,
                background: "linear-gradient(90deg,#fb7185,#f59e0b)",
                }}
            />
            </div>
        </div>

        

        <div className="mt-6 text-xs text-white/60">
            Built for: custom study sessions (min 1 hour), 25-min focus, user-picked
            breaks.
        </div>
        </div>
    </div>
  );
}
