/**
 * Right-side detail panel for the timeline.
 *
 * Two modes:
 *  - Hover preview: compact (icon + title + brief)
 *  - Click expanded: full (title, detail, sub-task checklist with toggles)
 */
export default function TimelineDetailPanel({
  node,
  mode,
  onToggleMilestone,
  onToggleSubTask,
  onClose,
  onTriggerReOnboard,
  currentPhase,
  phaseCompleted,
  profile,
}) {
  if (!node) {
    return (
      <div className="tl-detail tl-detail--empty">
        <div className="tl-detail__placeholder">
          <span className="tl-detail__placeholder-icon">★</span>
          <h3 className="tl-detail__placeholder-title">
            Explore your journey
          </h3>
          <p className="tl-detail__placeholder-sub">
            Hover over a milestone to preview it, or click to see full details
            and track your progress.
          </p>
        </div>
      </div>
    );
  }

  const isExpanded = mode === "expanded";
  const isDecision = node.type === "decision";

  return (
    <div
      className={`tl-detail tl-detail--active ${
        isExpanded ? "tl-detail--expanded" : "tl-detail--preview"
      }`}
      key={`${node.id}-${mode}`}
    >
      {/* Close button (expanded mode) */}
      {isExpanded && (
        <button
          className="tl-detail__close"
          onClick={onClose}
          type="button"
          aria-label="Close detail panel"
        >
          ✕
        </button>
      )}

      {/* Header */}
      <div className="tl-detail__header">
        <span className="tl-detail__node-icon">{node.icon}</span>
        <div>
          <span className="tl-detail__phase-badge">
            {node.timeLabel} • {node.ageLabel}
          </span>
          <h3 className="tl-detail__title">{node.title}</h3>
        </div>
      </div>

      {/* Status badge */}
      <div className="tl-detail__status-row">
        <span
          className={`tl-detail__status tl-detail__status--${node.status}`}
        >
          {node.status === "completed"
            ? "✓ Completed"
            : node.status === "current"
            ? "Ready to achieve"
            : "Locked"}
        </span>
        {node.totalSubTasks > 0 && (
          <span className="tl-detail__sub-count">
            {node.completedSubTasks}/{node.totalSubTasks} sub-tasks done
          </span>
        )}
      </div>

      {/* Description */}
      <p className="tl-detail__body">{node.detail}</p>

      {/* Decision branches */}
      {isDecision && node.branch && (
        <div className="tl-detail__branches">
          <h4 className="tl-detail__section-title">Available Paths</h4>
          <div className="tl-detail__branch-grid">
            {node.branch.options.map((opt) => {
              const isRec = opt.id.includes(
                node.branch.recommended?.toLowerCase?.() || ""
              );
              const isSel = opt.id.includes(
                node.branch.selected?.toLowerCase?.() || ""
              );
              return (
                <div
                  key={opt.id}
                  className={`tl-detail__branch-card ${
                    isSel ? "tl-detail__branch-card--selected" : ""
                  } ${isRec && !isSel ? "tl-detail__branch-card--rec" : ""}`}
                >
                  <span className="tl-detail__branch-icon">{opt.icon}</span>
                  <h5 className="tl-detail__branch-label">{opt.label}</h5>
                  <p className="tl-detail__branch-desc">{opt.description}</p>
                  {isSel && (
                    <span className="tl-detail__branch-badge">
                      ✓ Your Choice
                    </span>
                  )}
                  {isRec && !isSel && (
                    <span className="tl-detail__branch-badge tl-detail__branch-badge--rec">
                      ★ Recommended
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-tasks (expanded mode only) */}
      {isExpanded && node.subTasks && node.subTasks.length > 0 && (
        <div className="tl-detail__subtasks">
          <h4 className="tl-detail__section-title">
            Prerequisites & Sub-tasks
          </h4>
          <div className="tl-detail__subtask-list">
            {node.subTasks.map((sub) => (
              <label
                key={sub.id}
                className={`tl-detail__subtask ${
                  sub.completed ? "tl-detail__subtask--done" : ""
                }`}
                onClick={() => onToggleSubTask?.(sub.id)}
              >
                <div
                  className={`custom-checkbox shrink-0 ${
                    sub.completed ? "checked" : ""
                  }`}
                >
                  <div className="custom-checkbox-checkmark" />
                </div>
                <div>
                  <span
                    className={`tl-detail__subtask-title ${
                      sub.completed ? "tl-detail__subtask-title--done" : ""
                    }`}
                  >
                    {sub.title}
                  </span>
                  <span className="tl-detail__subtask-detail">
                    {sub.detail}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}



      {/* Mark complete button (expanded, non-decision, non-locked) */}
      {isExpanded && !isDecision && node.status !== "locked" && (
        <button
          className={`tl-detail__toggle-btn ${
            node.status === "completed"
              ? "tl-detail__toggle-btn--undo"
              : "tl-detail__toggle-btn--complete"
          }`}
          type="button"
          onClick={() => onToggleMilestone?.(node.milestoneId)}
        >
          {node.status === "completed"
            ? "Mark as Incomplete"
            : "Mark as Completed"}
        </button>
      )}
    </div>
  );
}
