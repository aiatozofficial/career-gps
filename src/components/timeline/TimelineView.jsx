import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GradientBackground } from "@/components/ui/gradient-background";
import {
  buildTimeline,
  getStageBookmarks,
} from "../../utils/timelineTransformer";
import {
  loadCompletedMilestones,
  saveCompletedMilestones,
} from "../../services/localStorageService";
import TimelineNode from "./TimelineNode";
import TimelineDetailPanel from "./TimelineDetailPanel";


/**
 * Full-screen RPG-style vertical timeline view.
 *
 * Layout:
 *  - Left (dark, ~60%): vertical glowing path with timeline nodes
 *  - Right (light, ~40%): detail panel (hover preview / click expanded)
 *  - Top bar: journey progress + stage bookmarks + navigation
 */
export default function TimelineView({
  profile,
  roadmap,
  onGoToDashboard,
  onReset,
  onProfileUpdate,
}) {
  const [completedMilestones, setCompletedMilestones] = useState(
    () => new Set(loadCompletedMilestones())
  );
  const currentPhase = profile.onboardingPhase || 1;
  const phaseCompleted = useMemo(() => {
    const milestones = roadmap.goalsToAchieve?.milestones || [];
    if (!milestones.length) return false;
    return milestones.every((ms) => completedMilestones.has(ms.id));
  }, [roadmap, completedMilestones]);

  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [panelMode, setPanelMode] = useState(null); // 'preview' | 'expanded'
  const hoverTimeoutRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [youAreHereStage, setYouAreHereStage] = useState("");

  // Build timeline data
  const timeline = useMemo(
    () => buildTimeline(roadmap, profile, completedMilestones),
    [roadmap, profile, completedMilestones]
  );

  const bookmarks = useMemo(
    () => getStageBookmarks(timeline.nodes),
    [timeline.nodes]
  );

  // Scroll to current node on mount
  useEffect(() => {
    if (timeline.currentNode) {
      const el = document.getElementById(`tl-node-${timeline.currentNode.id}`);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 600);
      }
      setYouAreHereStage(timeline.currentNode.stage);
    }
  }, []);

  // Sticky "You Are Here" tracker via IntersectionObserver
  useEffect(() => {
    const nodes = document.querySelectorAll(".tl-node-row");
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const stage = entry.target.getAttribute("data-stage");
            if (stage) {
              const bookmark = bookmarks.find((b) => b.id === stage);
              if (bookmark) setYouAreHereStage(bookmark.label);
            }
          }
        }
      },
      { threshold: 0.5 }
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [bookmarks]);

  // ── Milestone toggle ──
  const toggleMilestone = useCallback((milestoneId) => {
    setCompletedMilestones((current) => {
      const next = new Set(current);
      if (next.has(milestoneId)) {
        // Unchecking
        next.delete(milestoneId);
        
        // Cascade uncheck: if this is a main milestone, uncheck all subsequent ones
        const mainMilestones = roadmap?.goalsToAchieve?.milestones || [];
        const index = mainMilestones.findIndex(m => m.id === milestoneId);
        
        if (index !== -1) {
          for (let i = index + 1; i < mainMilestones.length; i++) {
            next.delete(mainMilestones[i].id);
            if (mainMilestones[i].prerequisites) {
              mainMilestones[i].prerequisites.forEach(pre => next.delete(pre.id));
            }
          }
        }
      } else {
        // Checking
        next.add(milestoneId);
      }
      saveCompletedMilestones(next);
      return next;
    });
  }, [roadmap]);

  // ── Hover handlers ──
  const handleHover = useCallback(
    (node) => {
      clearTimeout(hoverTimeoutRef.current);
      setHoveredNode(node);
      if (!selectedNode) {
        setPanelMode("preview");
      }
    },
    [selectedNode]
  );

  const handleHoverLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredNode(null);
      if (!selectedNode) {
        setPanelMode(null);
      }
    }, 200);
  }, [selectedNode]);

  // ── Click handler ──
  const handleClick = useCallback((node) => {
    setSelectedNode((prev) => {
      if (prev?.id === node.id) {
        setPanelMode(null);
        return null;
      }
      setPanelMode("expanded");
      return node;
    });
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null);
    setPanelMode(null);
  }, []);

  // The node displayed in the detail panel
  const displayNode = selectedNode || hoveredNode;

  // Quick-jump scroll to stage
  function scrollToStage(bookmark) {
    const el = document.getElementById(`tl-node-${bookmark.nodeId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  return (
    <GradientBackground
      className="bg-transparent min-h-screen relative flex flex-col font-sans text-slate-800"
      overlay={false}
      enableCenterContent={false}
    >
      {/* ━━━ Top Bar ━━━ */}
      <header className="tl-topbar">
        <div className="tl-topbar__left">
          <button
            className="tl-topbar__back"
            type="button"
            onClick={onGoToDashboard}
          >
            ← Dashboard
          </button>
          <div className="tl-topbar__you-are-here">
            <span className="tl-topbar__you-dot" />
            <span className="tl-topbar__you-label">{youAreHereStage}</span>
          </div>
        </div>

        <div className="tl-topbar__center">
          <div className="tl-topbar__progress-wrap">
            <span className="tl-topbar__progress-label">
              Journey: {timeline.progress}% complete
            </span>
            <div className="tl-topbar__progress-bar">
              <div
                className="tl-topbar__progress-fill"
                style={{ width: `${timeline.progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="tl-topbar__right">
          <span className="tl-topbar__stat">
            {timeline.completedNodes}/{timeline.totalNodes} milestones
          </span>
        </div>
      </header>

      {/* ━━━ Stage Bookmarks Bar ━━━ */}
      <nav className="tl-bookmarks">
        {bookmarks.map((bm) => (
          <button
            key={bm.id}
            className={`tl-bookmarks__item ${
              youAreHereStage === bm.label ? "tl-bookmarks__item--active" : ""
            }`}
            type="button"
            onClick={() => scrollToStage(bm)}
          >
            {bm.label}
          </button>
        ))}
      </nav>

      {/* ━━━ Main Content: Dark Left + Light Right ━━━ */}
      <div className="tl-body">
        {/* Left: Dark timeline path */}
        <div className="tl-path-panel" ref={scrollContainerRef}>
          <div className="tl-path-panel__inner">
            {/* Vertical glow line */}
            <div className="tl-glow-line" />

            {/* Timeline nodes */}
            {timeline.nodes.map((node) => (
              <TimelineNode
                key={node.id}
                node={node}
                isActive={displayNode?.id === node.id}
                onHover={handleHover}
                onLeave={handleHoverLeave}
                onClick={handleClick}
              />
            ))}

            {/* End marker */}
            <div className="tl-end-marker">
              <span className="tl-end-marker__icon">★</span>
              <span className="tl-end-marker__label">
                Your Dream Career Awaits
              </span>
            </div>
          </div>
        </div>

        {/* Right: Light detail panel */}
        <div className="tl-detail-panel-container">
          <div className="tl-detail-panel-sticky">
            <TimelineDetailPanel
              node={displayNode}
              mode={panelMode}
              onToggleMilestone={toggleMilestone}
              onToggleSubTask={toggleMilestone}
              onClose={handleClosePanel}
              currentPhase={currentPhase}
              phaseCompleted={phaseCompleted}
              profile={profile}
            />
          </div>
        </div>
      </div>
    </GradientBackground>
  );
}
