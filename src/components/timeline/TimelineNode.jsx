import { useEffect, useRef, useState } from "react";

/**
 * Individual timeline node — the circular RPG-style milestone marker.
 *
 * Features:
 * - Type-based icon (📖 education, 💼 job, ⚡ skill, 🏆 cert, 🎯 internship, 🔀 decision)
 * - Lock/unlock/completed visual states
 * - SVG progress ring for sub-task completion
 * - IntersectionObserver scroll-triggered reveal animation
 * - Pulsing glow for "current" node
 * - Hover tooltip with goal detail preview
 */
export default function TimelineNode({
  node,
  isActive,
  onHover,
  onLeave,
  onClick,
}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Scroll-triggered reveal
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const statusClass =
    node.status === "completed"
      ? "tl-node--completed"
      : node.status === "current"
      ? "tl-node--current"
      : "tl-node--locked";

  const visibleClass = isVisible ? "tl-node--visible" : "";
  const activeClass = isActive ? "tl-node--active" : "";
  const isDecision = node.type === "decision";

  // Progress ring calculations
  const hasSubTasks = node.totalSubTasks > 0;
  const progressFraction =
    hasSubTasks ? node.completedSubTasks / node.totalSubTasks : 0;
  const ringRadius = 28;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progressFraction);

  // Truncate detail for tooltip preview
  const tooltipText = node.detail
    ? node.detail.length > 120
      ? node.detail.slice(0, 120) + "…"
      : node.detail
    : "";

  const handleMouseEnter = () => {
    setShowTooltip(true);
    onHover?.(node);
  };
  const handleMouseLeave = () => {
    setShowTooltip(false);
    onLeave?.();
  };

  return (
    <div
      ref={ref}
      className={`tl-node-row ${visibleClass}`}
      id={`tl-node-${node.id}`}
      data-stage={node.stageId}
    >
      {/* Age / Year marker — left side */}
      <div className="tl-age-marker">
        <span className="tl-age-marker__age">{node.ageLabel}</span>
        <span className="tl-age-marker__year">{node.yearLabel}</span>
      </div>

      {/* Vertical connector line */}
      <div className="tl-connector">
        <div
          className={`tl-connector__line ${
            node.status === "completed" ? "tl-connector__line--done" : ""
          }`}
        />
      </div>

      {/* The node circle */}
      <button
        className={`tl-node ${statusClass} ${activeClass} ${
          isDecision ? "tl-node--decision" : ""
        }`}
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => onClick?.(node)}
        aria-label={`${node.title} — ${node.status}`}
      >
        {/* Progress ring SVG */}
        {hasSubTasks && node.status !== "locked" && (
          <svg className="tl-node__ring" viewBox="0 0 64 64">
            {/* Background ring */}
            <circle
              cx="32"
              cy="32"
              r={ringRadius}
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="3"
            />
            {/* Progress arc */}
            <circle
              cx="32"
              cy="32"
              r={ringRadius}
              fill="none"
              stroke={
                node.status === "completed"
                  ? "#10b981"
                  : "#f59e0b"
              }
              strokeWidth="3"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              strokeLinecap="round"
              transform="rotate(-90 32 32)"
              className="tl-node__ring-progress"
            />
          </svg>
        )}

        {/* Icon or status indicator */}
        <span className="tl-node__icon">
          {node.status === "completed" ? (
            "✓"
          ) : node.status === "locked" ? (
            <span className="tl-node__lock">
              •
            </span>
          ) : (
            node.icon
          )}
        </span>
      </button>

      {/* Node label (right of the circle) */}
      <div
        className={`tl-node-label ${
          isActive ? "tl-node-label--active" : ""
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => onClick?.(node)}
        style={{ position: "relative" }}
      >
        <span className="tl-node-label__time">{node.timeLabel}</span>
        <h4 className="tl-node-label__title">{node.title}</h4>
        {hasSubTasks && (
          <span className="tl-node-label__progress">
            {node.completedSubTasks}/{node.totalSubTasks} sub-tasks
          </span>
        )}

        {/* Hover tooltip */}
        {showTooltip && tooltipText && (
          <div className="tl-node-tooltip">
            <div className="tl-node-tooltip__arrow" />
            <p className="tl-node-tooltip__text">{tooltipText}</p>
          </div>
        )}
      </div>
    </div>
  );
}
