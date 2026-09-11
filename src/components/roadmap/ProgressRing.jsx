/**
 * ProgressRing.jsx
 *
 * Circular SVG progress ring shown in the top-right of the mindmap.
 * Displays: "[X]% toward [Career Goal]"
 * Only shows in mindmap view. Updates in real-time as goals are marked done.
 * Clicking opens a breakdown of completed vs total goals.
 */

import { useState } from "react";

export default function ProgressRing({ percent, careerGoal, completedCount, totalCount, onClose }) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const radius = 36;
  const stroke = 5;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  // Color based on progress
  const ringColor =
    percent >= 80 ? "#10b981" :  // emerald — almost there
    percent >= 50 ? "#7c3aed" :  // violet — good progress
    percent >= 25 ? "#3b82f6" :  // blue — building momentum
    "#6366f1";                   // indigo — just started

  return (
    <>
      {/* Ring button */}
      <button
        onClick={() => setShowBreakdown(v => !v)}
        className="progress-ring-btn"
        title={`${percent}% toward ${careerGoal}`}
        aria-label={`Progress: ${percent}% toward ${careerGoal}`}
      >
        <svg
          width={radius * 2}
          height={radius * 2}
          viewBox={`0 0 ${radius * 2} ${radius * 2}`}
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Background track */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={stroke}
          />
          {/* Progress arc */}
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.4s ease" }}
          />
        </svg>

        {/* Percent text in the center */}
        <div className="progress-ring-label">
          <span className="progress-ring-percent" style={{ color: ringColor }}>
            {percent}%
          </span>
          <span className="progress-ring-sublabel">done</span>
        </div>
      </button>

      {/* Breakdown panel */}
      {showBreakdown && (
        <>
          <div
            className="progress-ring-overlay"
            onClick={() => setShowBreakdown(false)}
          />
          <div className="progress-ring-breakdown">
            <div className="progress-ring-breakdown-header">
              <span className="progress-ring-breakdown-title">
                Your Progress
              </span>
              <button
                onClick={() => setShowBreakdown(false)}
                className="progress-ring-breakdown-close"
                aria-label="Close progress breakdown"
              >
                ✕
              </button>
            </div>

            <div className="progress-ring-breakdown-goal">
              <span className="progress-ring-breakdown-goal-label">Career Goal</span>
              <span className="progress-ring-breakdown-goal-value">{careerGoal}</span>
            </div>

            {/* Big ring inside breakdown */}
            <div className="progress-ring-breakdown-ring-wrap">
              <svg
                width={100}
                height={100}
                viewBox="0 0 100 100"
                style={{ transform: "rotate(-90deg)" }}
              >
                <circle cx={50} cy={50} r={42} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
                <circle
                  cx={50} cy={50} r={42} fill="none"
                  stroke={ringColor} strokeWidth={8}
                  strokeDasharray={`${2 * Math.PI * 42} ${2 * Math.PI * 42}`}
                  strokeDashoffset={2 * Math.PI * 42 - (percent / 100) * 2 * Math.PI * 42}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.6s ease" }}
                />
              </svg>
              <div className="progress-ring-breakdown-ring-text">
                <span style={{ color: ringColor, fontSize: 22, fontWeight: 700 }}>{percent}%</span>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>complete</span>
              </div>
            </div>

            {/* Stats */}
            <div className="progress-ring-breakdown-stats">
              <div className="progress-ring-stat">
                <span className="progress-ring-stat-num" style={{ color: ringColor }}>{completedCount}</span>
                <span className="progress-ring-stat-lbl">Goals Done</span>
              </div>
              <div className="progress-ring-stat-divider" />
              <div className="progress-ring-stat">
                <span className="progress-ring-stat-num">{totalCount - completedCount}</span>
                <span className="progress-ring-stat-lbl">Remaining</span>
              </div>
              <div className="progress-ring-stat-divider" />
              <div className="progress-ring-stat">
                <span className="progress-ring-stat-num">{totalCount}</span>
                <span className="progress-ring-stat-lbl">Total Goals</span>
              </div>
            </div>

            {percent < 100 && (
              <p className="progress-ring-breakdown-note">
                🎯 Keep completing goals to unlock the next stage!
              </p>
            )}
            {percent >= 100 && (
              <p className="progress-ring-breakdown-note" style={{ color: "#10b981" }}>
                🎉 You&apos;ve reached your career goal!
              </p>
            )}
          </div>
        </>
      )}
    </>
  );
}
