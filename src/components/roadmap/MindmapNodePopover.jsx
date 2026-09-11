import { useEffect, useRef, useState } from "react";

const TYPE_LABELS = {
  root:       "Starting Point",
  stage:      "Academic Path",
  semester:   "Semester Phase",
  selection:  "Choice Node",
  checkpoint: "Checkpoint Check",
  cert:       "Certification",
  internship: "Internship Target",
  goal:       "Career Goal",
  alternate:  "Alternate Path",
  skill:      "Skills to Build",
  quarterly:  "Quarterly Phase"
};

const NODE_COLORS = {
  root:        "#7c3aed",
  stage:       "#2563eb",
  semester:    "#059669",
  selection:   "#0891b2",
  checkpoint:  "#f59e0b",
  cert:        "#f59e0b",
  internship:  "#6366f1",
  goal:        "#f7d06b",
  alternate:   "#f4a38f",
  skill:       "#c084fc",
  quarterly:   "#0891b2",
};

export default function MindmapNodePopover({
  node,
  nodeContent,
  onClose,
  completedGoals,
  onToggleGoal,
  disabled,
  profile,
  userSelections,
  onSelectOption
}) {
  const panelRef = useRef(null);
  const [tooltip, setTooltip] = useState(null); // { text, x, y }

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  if (!node) {
    return (
      <div
        className="h-full w-full flex flex-col justify-center items-center px-8 py-12 text-center"
        style={{
          background: "linear-gradient(160deg, #ffffff 0%, #f8fafc 100%)",
          height: "100%",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
          style={{ background: "rgba(124, 58, 237, 0.06)", border: "1px solid rgba(124, 58, 237, 0.15)" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth={2} className="w-8 h-8 animate-pulse">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Explore Career Mindmap</h3>
        <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
          Click on any unlocked node in the mindmap to view action items, target skills, and checkboxes to track your progress.
        </p>
        
        <div className="mt-8 pt-6 border-t border-slate-200/60 w-full text-left space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Navigation Tips</p>
          <div className="flex gap-2.5 items-start text-xs text-slate-600">
            <span className="text-violet-500 font-bold">•</span>
            <span>Complete 80% of current node goals to unlock the next stage.</span>
          </div>
          <div className="flex gap-2.5 items-start text-xs text-slate-600">
            <span className="text-violet-500 font-bold">•</span>
            <span>Drag the canvas to pan, and scroll/pinch to zoom.</span>
          </div>
        </div>
      </div>
    );
  }

  const color = NODE_COLORS[node.type] || "#6b7280";
  const typeLabel = TYPE_LABELS[node.type] || node.type;

  // Use cached node content or fallback to node's native fields
  const goals = nodeContent?.goals || node.goals || [];
  const achievements = nodeContent?.achievements || node.achievements || [];
  const skills = nodeContent?.skills || node.skills || [];
  const summary = nodeContent?.summary || node.detail || "";
  const goalReasons = nodeContent?.goal_reasons || node.goal_reasons || {};
  const options = nodeContent?.options || node.options || [];
  const recommendedOption = nodeContent?.recommended_option || node.recommendedOption || "";

  const handleMouseEnter = (e, text) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      text,
      x: rect.left + window.scrollX + 25,
      y: rect.top + window.scrollY - 30
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <div
      ref={panelRef}
      className="relative h-full w-full flex flex-col overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #ffffff 0%, #f8fafc 100%)",
        borderLeft: `4px solid ${color}`,
        boxShadow: `-4px 0 24px rgba(0,0,0,0.03)`,
        animation: "slideInRight 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
        <div className="flex-1 min-w-0">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest mb-3"
            style={{ background: `${color}12`, color, border: `1px solid ${color}30` }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
            {typeLabel}
          </div>

          <h2 className="text-xl font-bold leading-tight text-slate-900">
            {node.label}
          </h2>

          {node.timeframe && (
            <p className="mt-1.5 text-sm font-semibold" style={{ color }}>
              {node.timeframe}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="flex-shrink-0 mt-0.5 rounded-full w-8 h-8 flex items-center justify-center transition hover:bg-slate-100 text-slate-500"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div style={{ height: 1, background: "#e2e8f0" }} />

      {/* Popover body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 scrollbar-thin">
        {/* Target Goal Banner */}
        {profile?.goal?.description && (
          <div className="rounded-xl p-3.5 bg-violet-50/50 border border-violet-100/70">
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 mb-1 font-semibold">
              Target Career Goal
            </p>
            <p className="text-sm font-bold text-slate-800 leading-snug">
              {profile.goal.description}
            </p>
          </div>
        )}

        {/* Lock indicator */}
        {disabled && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-amber-600 text-lg mt-0.5">🔒</span>
            <div>
              <h4 className="text-xs font-bold text-amber-800">Stage Locked</h4>
              <p className="text-[11px] text-amber-700 leading-relaxed mt-0.5">
                You can preview these goals, but you cannot mark them complete until the preceding stages are finished.
              </p>
            </div>
          </div>
        )}

        {/* Summary text */}
        {summary && (
          <p className="text-sm leading-relaxed text-slate-600">
            {summary}
          </p>
        )}

        {/* Selection options if it's a choice node */}
        {node.isSelectionPoint && options.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Make Your Choice
            </p>
            <div className="flex flex-col gap-2.5">
              {options.map((opt, idx) => {
                const isSelected = userSelections[node.id] === opt;
                const isRecommended = recommendedOption === opt;
                
                return (
                  <button
                    key={idx}
                    disabled={disabled}
                    onClick={() => !disabled && onSelectOption(node.id, opt)}
                    className={`text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1 ${
                      disabled
                        ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                        : isSelected
                        ? "bg-cyan-50/40 border-cyan-500 border-2 shadow-sm text-slate-900"
                        : "bg-white border-slate-200 hover:border-slate-350 text-slate-700"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold text-xs">{opt}</span>
                      {isRecommended && (
                        <span className="text-[9px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                          Recommended ⭐
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Checkpoint Achievements */}
        {(node.isCheckpoint || node.type === "checkpoint" || achievements.length > 0) && achievements.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
              Milestone Achievements
            </p>
            <div className="space-y-2.5">
              {achievements.map((ach, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 text-slate-800"
                >
                  <span className="text-amber-500 text-sm mt-0.5 flex-shrink-0">⭐</span>
                  <div className="flex-1 text-xs leading-normal select-none font-medium">
                    {ach}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interactive Goals Checklist */}
        {!node.isSelectionPoint && !node.isCheckpoint && node.type !== "checkpoint" && goals.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Checklist Goals
            </p>
            <div className="space-y-2.5">
              {goals.map((g, idx) => {
                const isChecked = completedGoals.has(g);
                const whyReason = goalReasons[g] || `This helps you build target skills for your career.`;
                
                return (
                  <div 
                    key={idx}
                    onClick={() => !disabled && onToggleGoal(g)}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ${
                      disabled
                        ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                        : "cursor-pointer select-none"
                    } ${
                      isChecked 
                        ? "bg-emerald-50/40 border-emerald-200 text-slate-800" 
                        : "bg-white border-slate-200 hover:border-slate-350 text-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={isChecked}
                      readOnly={true}
                      className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 pointer-events-none disabled:opacity-50"
                    />
                    <div className="flex-1 text-xs leading-normal pr-1">
                      {g}
                    </div>
                    {/* Lightbulb tooltip icon */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onMouseEnter={(e) => handleMouseEnter(e, whyReason)}
                      onMouseLeave={handleMouseLeave}
                      className="text-slate-400 hover:text-amber-500 transition-colors p-0.5 -mt-0.5 flex-shrink-0"
                      aria-label="Why this matters"
                    >
                      💡
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Required Skills tags */}
        {skills.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-slate-500">
              Skills to Acquire
            </p>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{
                    background: `${NODE_COLORS.skill}10`,
                    color: NODE_COLORS.skill,
                    border: `1px solid ${NODE_COLORS.skill}30`,
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating fixed portal tooltip */}
      {tooltip && (
        <div
          className="fixed bg-slate-900 border border-slate-800 text-white rounded-xl shadow-2xl p-3 max-w-[280px] z-[9999] text-xs leading-normal animate-fadeIn flex gap-2.5 items-start"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
        >
          <span className="text-amber-400 mt-0.5">💡</span>
          <div>
            <p className="font-bold text-slate-400 mb-0.5">Why This Matters</p>
            <p className="text-slate-200">{tooltip.text}</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
