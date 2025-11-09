"use client";

import React, { useEffect, useRef, useState } from "react";

type Mode = "work" | "break";

const WORK_MINUTES = 25;

export default function Pomodoro() {
  // user settings
  const [studyHours, setStudyHours] = useState<number>(1);
  const [userBreakMinutes, setUserBreakMinutes] = useState<number>(5);

  // monopoly money
  const [money, setMoney] = useState(1500); // starting balance
  const REWARD_PER_CYCLE = 200;
  const PENALTY_PER_CYCLE = 100;

  // timer state
  const [mode, setMode] = useState<Mode>("work");
  const [isRunning, setIsRunning] = useState(false);
  const [remaining, setRemaining] = useState(WORK_MINUTES * 60);
  const [totalStudySecondsLeft, setTotalStudySecondsLeft] = useState(
    1 * 60 * 60
  );

  const intervalRef = useRef<number | null>(null);

  // start interval
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

  

  function start() {
    const total = Math.max(1, studyHours) * 60 * 60;
    setTotalStudySecondsLeft(total);
    setMode("work");
    setRemaining(WORK_MINUTES * 60);
    setIsRunning(true);
    startInterval();
  }

  function pause() {
    setIsRunning(false);
    clearIntervalRef();
  }

  function reset(toMode: Mode = mode) {
    pause();
    setMode(toMode);
    setRemaining(getModeDuration(toMode));
  }

  function getModeDuration(m: Mode) {
    if (m === "work") return WORK_MINUTES * 60;
    return userBreakMinutes * 60;
  }

  const modeRef = useRef<Mode>("work");
useEffect(() => { modeRef.current = mode; }, [mode]);

const totalRef = useRef<number>(totalStudySecondsLeft);
useEffect(() => { totalRef.current = totalStudySecondsLeft; }, [totalStudySecondsLeft]);

// Drive the interval from state (avoids “orphaned” stale callbacks)
useEffect(() => {
  if (!isRunning) return;
  if (intervalRef.current === null) {
    intervalRef.current = window.setInterval(tick, 1000);
  }
  return () => clearIntervalRef();
}, [isRunning]);

function tick() {
  // use functional updates + refs to avoid stale closures
  setRemaining(prev => {
    if (prev <= 1) {
      finishSession(modeRef.current);
      // we return 0 here; finishSession will immediately set the next duration
      return 0;
    }
    return prev - 1;
  });

  if (modeRef.current === "work") {
    setTotalStudySecondsLeft(prev => Math.max(0, prev - 1));
  }
}

// Accept the current mode explicitly (from ref) to avoid stale reads
function finishSession(currentMode: Mode) {
  if (currentMode === "work") {
    // award $ for finishing a focus block
    setMoney(prev => prev + REWARD_PER_CYCLE);

    // decrement total with a functional update so it's never stale
    setTotalStudySecondsLeft(prev => {
      const next = prev - WORK_MINUTES * 60;
      if (next <= 0) {
        pause();
        return 0;
      }
      return next;
    });

    setMode("break");
    setRemaining(userBreakMinutes * 60);
  } else {
    setMode("work");
    setRemaining(WORK_MINUTES * 60);
  }
}

// Optional: make Skip award immediately instead of waiting 1s for the next tick
// (this feels snappier in the UI)
<button
  onClick={() => {
    if (!isRunning) return;
    finishSession(modeRef.current);
  }}
  className="px-4 py-2 rounded-lg bg-white/6 hover:bg-white/10 text-white"
>
  Skip
</button>

  // cleanup
  useEffect(() => {
    return () => clearIntervalRef();
  }, []);

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  }

  const totalCurrent = getModeDuration(mode);
  const percent = Math.max(
    0,
    Math.min(100, Math.round(((totalCurrent - remaining) / totalCurrent) * 100))
  );
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  const breakOptions = [5, 10, 15, 20, 25, 30];

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed flex items-center justify-center"
      style={{
        backgroundImage: "url('/monopoly-board-game-3dcjb0g7y2c0n5d0.jpg')",
      }}
    >
      <div className="w-full max-w-2xl bg-black/70 rounded-2xl p-6 shadow-2xl border border-white/5 text-white">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Stay Locked – Session</h1>
          <div className="flex items-center gap-4 text-sm opacity-80">
            <span>
              Study left: {Math.ceil(totalStudySecondsLeft / 60)} min
            </span>
            <span className="bg-green-500/20 border border-green-400/40 px-3 py-1 rounded-full text-green-200 font-mono">
              ${money}
            </span>
          </div>
        </div>

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
            {/* demo button to simulate distraction */}
            <button
              onClick={() =>
                setMoney((prev) => Math.max(0, prev - PENALTY_PER_CYCLE))
              }
              className="px-4 py-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-white"
            >
              Mark Distracted
            </button>
          </div>

          <div className="mt-4 text-xs text-white/70">
            Progress: {percent}%
          </div>
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
          Built for: custom study sessions (min 1 hour), 25-min focus,
          user-picked breaks, Monopoly rewards.
        </div>
      </div>
    </div>
  );
}
