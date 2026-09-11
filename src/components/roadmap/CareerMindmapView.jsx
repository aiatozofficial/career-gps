import { useState, useMemo, useCallback, useEffect } from "react";
import {
  loadCompletedMilestones,
  saveCompletedMilestones,
  loadFinancialTier,
  saveFinancialTier,
  loadNodeCache,
  saveNodeCache,
  loadNodeStates,
  saveNodeStates,
  loadCompletedGoalsList,
  saveCompletedGoalsList,
  loadUserSelections,
  saveUserSelections,
  loadMindmapExpandedNodes,
  saveMindmapExpandedNodes
} from "../../services/localStorageService";
import { buildMindmapScaffold, flattenScaffold, calculateProgress, SCAFFOLD_COLORS } from "../../data/scaffoldBuilder";
import CareerMindmap from "./CareerMindmap";
import MindmapNodePopover from "./MindmapNodePopover";
import ProgressRing from "./ProgressRing";
import CheckpointPanel from "./CheckpointPanel";

const LEGEND = [
  { type: "root",       label: "You (Start)" },
  { type: "stage",      label: "Academic Path" },
  { type: "semester",    label: "Semester Phase" },
  { type: "selection",   label: "Choice Point" },
  { type: "choice-option", label: "Option Branch" },
  { type: "choice-option-selected", label: "Selected Branch" },
  { type: "checkpoint",  label: "Checkpoint Node" },
  { type: "skill",      label: "Skills to Build" },
];

const TIER_OPTIONS = [
  { value: "LOW",    label: "Free only",   desc: "Free resources" },
  { value: "MEDIUM", label: "Affordable",  desc: "Low-cost options" },
  { value: "HIGH",   label: "Self-funded", desc: "All options" },
];

export default function CareerMindmapView({ profile, roadmap, onGoToDashboard }) {
  // ── State ──
  const [financialTier, setFinancialTier] = useState(
    () => loadFinancialTier() || profile?.financialTier || "HIGH"
  );
  
  const [nodeCache, setNodeCache] = useState(() => loadNodeCache());
  const [nodeStates, setNodeStates] = useState(() => loadNodeStates());
  const [completedGoals, setCompletedGoals] = useState(() => new Set(loadCompletedGoalsList()));
  const [userSelections, setUserSelections] = useState(() => loadUserSelections());

  const [activeNode, setActiveNode] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [showLegend, setShowLegend] = useState(true);

  // Checkpoint panel states
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const [checkpointLabel, setCheckpointLabel] = useState("");
  const [checkpointData, setCheckpointData] = useState(null);
  const [loadingCheckpoint, setLoadingCheckpoint] = useState(false);

  // Expand/collapse node IDs
  const [expandedNodeIds, setExpandedNodeIds] = useState(() => {
    const saved = loadMindmapExpandedNodes();
    return saved ? new Set(saved) : new Set(["node-root"]);
  });

  useEffect(() => {
    saveMindmapExpandedNodes(Array.from(expandedNodeIds));
  }, [expandedNodeIds]);

  // ── Build Mindmap Scaffold Tree ──
  const scaffoldTree = useMemo(() => {
    return buildMindmapScaffold(profile, nodeStates, userSelections);
  }, [profile, nodeStates, userSelections]);

  // Flatten scaffold for node index checks
  const flatScaffold = useMemo(() => {
    return flattenScaffold(scaffoldTree);
  }, [scaffoldTree]);

  // Find the current stage starting node
  const startingNodeId = useMemo(() => {
    const startingNode = flatScaffold.find(n => n.isCurrentStage);
    return startingNode ? startingNode.id : "node-root";
  }, [flatScaffold]);

  // ── Recalculate states recursively based on checklist completion ──
  const reevaluateStates = useCallback((currentGoals, currentSelections, currentCache, currentStates) => {
    // Start with a default scaffold
    const root = buildMindmapScaffold(profile, {}, currentSelections);
    const flat = flattenScaffold(root);
    const nextStates = {};

    // Root is always completed
    nextStates["node-root"] = "completed";

    // Set starting node to unlocked by default if not set
    const startNode = flat.find(n => n.isCurrentStage);
    if (startNode) {
      nextStates[startNode.id] = "unlocked";
    }

    const safeGoals = currentGoals || new Set();
    const safeCache = currentCache || {};
    const safeStates = currentStates || nodeStates || {};

    function walk(node) {
      if (!node) return;
      const state = nextStates[node.id] || "locked";
      
      // Unlocks children if parent is active (not locked)
      const isParentActive = state !== "locked";
      const selection = node.isSelectionPoint ? (currentSelections || {})[node.id] : null;

      if (node.children) {
        for (const child of node.children) {
          if (!child) continue;
        // 1. If parent is a selection point:
        if (node.isSelectionPoint) {
          const isSingleChild = node.children.length === 1;
          if (!selection) {
            nextStates[child.id] = isParentActive ? "unlocked" : "locked";
          } else if (isSingleChild || child.label === selection) {
            const nextState = "unlocked";
            // Dynamically check if child is completed based on safeGoals checklist
            const childContent = safeCache[child.id];
            const childGoals = childContent?.goals || [];
            if (childGoals.length > 0) {
              const completedCount = childGoals.filter(g => safeGoals.has(g)).length;
              if (completedCount === childGoals.length) {
                nextStates[child.id] = "completed";
              } else if (completedCount > 0) {
                nextStates[child.id] = "in_progress";
              } else {
                nextStates[child.id] = nextState;
              }
            } else {
              const oldState = safeStates[child.id] || "locked";
              nextStates[child.id] = (oldState === "completed" || oldState === "in_progress") ? oldState : nextState;
            }
          } else {
            nextStates[child.id] = "locked";
          }
        } 
        // 2. If child is a selection point itself:
        else if (child.isSelectionPoint) {
          const childSelection = currentSelections[child.id];
          if (childSelection) {
            nextStates[child.id] = "completed";
          } else {
            nextStates[child.id] = isParentActive ? "unlocked" : "locked";
          }
        } 
        // 3. If child is a checkpoint:
        else if (child.isCheckpoint) {
          nextStates[child.id] = isParentActive ? "completed" : "locked";
        } 
        // 4. Regular child node:
        else {
          const nextState = isParentActive ? "unlocked" : "locked";
          if (nextState !== "locked") {
            // Dynamically check if child is completed based on safeGoals checklist
            const childContent = safeCache[child.id];
            const childGoals = childContent?.goals || [];
            if (childGoals.length > 0) {
              const completedCount = childGoals.filter(g => safeGoals.has(g)).length;
              if (completedCount === childGoals.length) {
                nextStates[child.id] = "completed";
              } else if (completedCount > 0) {
                nextStates[child.id] = "in_progress";
              } else {
                nextStates[child.id] = nextState;
              }
            } else {
              const oldState = safeStates[child.id] || "locked";
              nextStates[child.id] = (oldState === "completed" || oldState === "in_progress") ? oldState : nextState;
            }
          } else {
            nextStates[child.id] = "locked";
          }
        }

        walk(child);
      }
    }
  }

    walk(root);
    return nextStates;
  }, [profile, nodeStates]);

  useEffect(() => {
    const updatedStates = reevaluateStates(completedGoals, userSelections, nodeCache, nodeStates);
    if (JSON.stringify(updatedStates) !== JSON.stringify(nodeStates || {})) {
      setNodeStates(updatedStates);
      saveNodeStates(updatedStates);
    }
  }, [completedGoals, userSelections, nodeCache, nodeStates, reevaluateStates]);

  // Eagerly fetch starting node content on mount
  useEffect(() => {
    if (startingNodeId && !nodeCache[startingNodeId]) {
      const fetchStartNodeContent = async () => {
        try {
          const startingNode = flatScaffold.find(n => n.id === startingNodeId);
          if (!startingNode) return;
          
          const response = await fetch("/api/node-content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profile,
              nodeId: startingNodeId,
              nodeType: startingNode.type,
              nodeLabel: startingNode.label,
              parentNodeLabel: "You Are Here",
              allCompletedGoals: Array.from(completedGoals),
              userSelections
            })
          });

          if (response.ok) {
            const data = await response.json();
            const updatedCache = { ...nodeCache, [startingNodeId]: data };
            setNodeCache(updatedCache);
            saveNodeCache(updatedCache);
            
            // Re-evaluate states
            const updatedStates = reevaluateStates(completedGoals, userSelections, updatedCache, nodeStates);
            setNodeStates(updatedStates);
            saveNodeStates(updatedStates);
          }
        } catch (e) {
          console.error("Failed to eagerly fetch starting node content", e);
        }
      };
      
      fetchStartNodeContent();
    }
  }, [startingNodeId, nodeCache, flatScaffold, profile, completedGoals, userSelections, reevaluateStates]);

  // Eagerly pre-fetch content for any unlocked nodes in the background
  useEffect(() => {
    const fetchUnlockedContent = async () => {
      const unfetchedUnlockedNodes = flatScaffold.filter(n => {
        const state = (nodeStates || {})[n.id] || n.state;
        return state !== "locked" && !(nodeCache || {})[n.id] && !n.isSelectionPoint;
      });

      if (unfetchedUnlockedNodes.length === 0) return;

      for (const node of unfetchedUnlockedNodes) {
        try {
          const response = await fetch("/api/node-content", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              profile,
              nodeId: node.id,
              nodeType: node.type,
              nodeLabel: node.label,
              parentNodeLabel: node.parentId ? (flatScaffold.find(p => p.id === node.parentId)?.label || "Parent Node") : "You Are Here",
              allCompletedGoals: Array.from(completedGoals),
              userSelections
            })
          });

          if (response.ok) {
            const data = await response.json();
            setNodeCache(prev => {
              const updated = { ...prev, [node.id]: data };
              saveNodeCache(updated);
              
              // Trigger a re-evaluation of states with the new cache data
              setTimeout(() => {
                setNodeStates(oldStates => {
                  const nextStates = reevaluateStates(completedGoals, userSelections, updated, oldStates);
                  saveNodeStates(nextStates);
                  return nextStates;
                });
              }, 0);

              return updated;
            });
          }
        } catch (e) {
          console.error(`Failed to eagerly fetch content for unlocked node ${node.id}`, e);
        }
      }
    };

    fetchUnlockedContent();
  }, [flatScaffold, nodeStates, nodeCache, profile, completedGoals, userSelections, reevaluateStates]);

  // ── Fetch node content dynamically on click ──
  const fetchNodeContent = async (nodeId, nodeType, nodeLabel, parentNodeLabel) => {
    if (nodeCache[nodeId]) return;

    try {
      const response = await fetch("/api/node-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          nodeId,
          nodeType,
          nodeLabel,
          parentNodeLabel,
          allCompletedGoals: Array.from(completedGoals),
          userSelections
        })
      });

      if (response.ok) {
        const data = await response.json();
        const updatedCache = { ...nodeCache, [nodeId]: data };
        setNodeCache(updatedCache);
        saveNodeCache(updatedCache);

        // Re-evaluate states after new content is loaded
        const updatedStates = reevaluateStates(completedGoals, userSelections, updatedCache, nodeStates);
        setNodeStates(updatedStates);
        saveNodeStates(updatedStates);
      }
    } catch (e) {
      console.error("Failed to fetch node content", e);
    }
  };

  // ── Selection Point choice select handler ──
  const handleSelectOption = useCallback((nodeId, option) => {
    setUserSelections(prev => {
      const next = { ...prev };
      if (option === undefined) {
        delete next[nodeId];
      } else {
        next[nodeId] = option;
      }
      saveUserSelections(next);

      const nextStates = { ...nodeStates };
      if (option === undefined) {
        nextStates[nodeId] = "unlocked";
      } else {
        nextStates[nodeId] = "completed";
      }
      const updatedStates = reevaluateStates(completedGoals, next, nodeCache, nodeStates);
      updatedStates[nodeId] = option === undefined ? "unlocked" : "completed";

      setNodeStates(updatedStates);
      saveNodeStates(updatedStates);
      return next;
    });

    // Expand selection child node auto
    const node = flatScaffold.find(n => n.id === nodeId);
    if (node) {
      setExpandedNodeIds(prev => {
        const next = new Set(prev);
        next.add(nodeId);
        return next;
      });
    }
  }, [userSelections, nodeStates, completedGoals, nodeCache, flatScaffold, reevaluateStates]);

  const handleNodeClick = useCallback((node) => {
    if (node.type === "choice-option") {
      const confirmed = window.confirm(`Select "${node.label}"? This will unlock the next milestone path.`);
      if (confirmed) {
        let selVal = node.selectionValue;
        let parentId = node.selectionParentId;
        
        if (parentId === "node-masters-select") {
          const tier = node.selectionTier || "Tier 1";
          localStorage.setItem(`career-gps:sel-masters-tier-${profile?.name || "default"}`, tier);
        } else if (parentId === "node-postgrad-select" && selVal === "→ Enter Workforce") {
          const prog = node.selectionProgression || "SENIOR";
          localStorage.setItem(`career-gps:sel-progression-${profile?.name || "default"}`, prog);
        }
        
        handleSelectOption(parentId, selVal);
      }
      return;
    }

    if (node.type === "choice-option-selected") {
      const confirmed = window.confirm(`Reset or change selection for "${node.label}"? This will re-lock downstream milestones.`);
      if (confirmed) {
        handleSelectOption(node.selectionParentId, undefined);
      }
      return;
    }

    // Expand selection node on click
    if (node.type === "selection" || node.id.includes("-select")) {
      return;
    }

    setActiveNode(node);
    setIsLocked(true);

    // If it's a checkpoint node, show checkpoint panel instead
    if (node.isCheckpoint) {
      handleCheckpointClick(node);
      return;
    }

    // Load content dynamically
    if (node.state !== "locked") {
      fetchNodeContent(node.id, node.type, node.label, node.parentId);
    }
  }, [nodeCache, completedGoals, userSelections, reevaluateStates, handleSelectOption, profile?.name]);

  const handleNodeHover = useCallback((node) => {
    if (node.type === "selection" || node.id.includes("-select") || node.type === "choice-option" || node.type === "choice-option-selected") {
      return;
    }
    if (!isLocked) {
      setActiveNode(node);
      // Pre-fetch hover content eagerly for smooth transition
      if (node.state !== "locked") {
        fetchNodeContent(node.id, node.type, node.label, node.parentId);
      }
    }
  }, [isLocked, nodeCache]);

  const handleClosePopover = useCallback(() => {
    setIsLocked(false);
    setActiveNode(null);
  }, []);

  const handleCanvasClick = useCallback(() => {
    setIsLocked(false);
    setActiveNode(null);
  }, []);

  // ── Checkbox checklist toggle handler ──
  const handleToggleGoal = useCallback((goalText) => {
    if (!activeNode) return;
    
    setCompletedGoals(prev => {
      const next = new Set(prev);
      if (next.has(goalText)) {
        next.delete(goalText);
      } else {
        next.add(goalText);
      }
      
      // Save to local storage
      const list = Array.from(next);
      saveCompletedGoalsList(list);

      // Recalculate status of the active node
      const goals = nodeCache[activeNode.id]?.goals || [];
      const completedCount = goals.filter(g => next.has(g)).length;
      
      let nextState = "unlocked";
      if (completedCount === goals.length) {
        nextState = "completed";
      } else if (completedCount > 0) {
        nextState = "in_progress";
      }

      const nextStates = { ...nodeStates, [activeNode.id]: nextState };
      
      // Propagate locks / unlocks downwards
      const updatedStates = reevaluateStates(next, userSelections, nodeCache, nodeStates);
      // Merge nextState of current activeNode
      updatedStates[activeNode.id] = nextState;

      setNodeStates(updatedStates);
      saveNodeStates(updatedStates);

      return next;
    });
  }, [activeNode, nodeCache, nodeStates, userSelections, reevaluateStates]);



  // ── Checkpoint display handler ──
  const handleCheckpointClick = async (node) => {
    setCheckpointLabel(node.label);
    setShowCheckpoint(true);
    setLoadingCheckpoint(true);
    setCheckpointData(null);

    // Gather completed items
    const completedGoalsList = Array.from(completedGoals);
    
    // Deduplicate skills from cache of completed nodes
    const completedSkillsSet = new Set();
    const completedCertsList = [];
    const completedInternshipsList = [];

    flatScaffold.forEach(n => {
      const state = nodeStates[n.id] || n.state;
      if (state === "completed" || state === "in_progress") {
        const content = nodeCache[n.id];
        if (content) {
          (content.skills || []).forEach(s => completedSkillsSet.add(s));
          if (n.type === "cert") completedCertsList.push(n.label);
          if (n.type === "internship") completedInternshipsList.push(n.label);
        }
      }
    });

    try {
      const response = await fetch("/api/checkpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          checkpointLabel: node.label,
          completedGoals: completedGoalsList,
          completedSkills: Array.from(completedSkillsSet),
          completedCerts: completedCertsList,
          completedInternships: completedInternshipsList
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCheckpointData(data);
      }
    } catch (e) {
      console.error("Checkpoint endpoint error", e);
    } finally {
      setLoadingCheckpoint(false);
    }
  };

  // ── Financial tier change handler ──
  const handleTierChange = useCallback((tier) => {
    setFinancialTier(tier);
    saveFinancialTier(tier);
  }, []);

  // ── Progress statistics relative to unlocked goals ──
  const progressStats = useMemo(() => {
    return calculateProgress(scaffoldTree, nodeCache, nodeStates, completedGoals);
  }, [scaffoldTree, nodeCache, nodeStates, completedGoals]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', -apple-system, sans-serif",
      }}
    >
      {/* Top bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "12px 20px",
          background: "rgba(255, 255, 255, 0.95)",
          borderBottom: "1px solid #e2e8f0",
          backdropFilter: "blur(12px)",
          flexShrink: 0,
          zIndex: 100,
        }}
      >
        {/* Left — back + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            id="mindmap-back-dashboard"
            onClick={onGoToDashboard}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              color: "#334155",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#0f172a"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.color = "#334155"; }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} style={{ width: 14, height: 14 }}>
              <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Dashboard
          </button>

          <div style={{ width: 1, height: 24, background: "#cbd5e1" }} />

          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#7c3aed", marginBottom: 1 }}>
              Career GPS
            </p>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0, lineHeight: 1.2 }}>
              Interactive Mindmap
            </h1>
          </div>
        </div>

        {/* Center — progress tracker bar (backup reference) */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>
            Active Stage Goals: {progressStats.completedCount}/{progressStats.totalCount}
          </span>
        </div>

        {/* Right — tier selector + legend toggle + Progress Ring */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Financial tier */}
          <div style={{ display: "flex", gap: 4 }}>
            {TIER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleTierChange(opt.value)}
                title={opt.desc}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  border: "1px solid",
                  ...(financialTier === opt.value
                    ? { background: "#7c3aed", borderColor: "#7c3aed", color: "#fff" }
                    : { background: "#ffffff", borderColor: "#cbd5e1", color: "#475569" }
                  ),
                }}
                onMouseEnter={e => {
                  if (financialTier !== opt.value) e.currentTarget.style.background = "#f1f5f9";
                }}
                onMouseLeave={e => {
                  if (financialTier !== opt.value) e.currentTarget.style.background = "#ffffff";
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Legend toggle */}
          <button
            id="mindmap-toggle-legend"
            onClick={() => setShowLegend(s => !s)}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid #cbd5e1",
              background: showLegend ? "#e2e8f0" : "#ffffff",
              color: "#475569",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = showLegend ? "#cbd5e1" : "#f1f5f9"; }}
            onMouseLeave={e => { e.currentTarget.style.background = showLegend ? "#e2e8f0" : "#ffffff"; }}
          >
            Legend
          </button>

          {/* Feature 1 — Progress Ring */}
          <ProgressRing
            percent={progressStats.percent}
            careerGoal={profile.goal?.description || "your goal"}
            completedCount={progressStats.completedCount}
            totalCount={progressStats.totalCount}
          />
        </div>
      </header>

      {/* Canvas area */}
      <div style={{ flex: 1, display: "flex", position: "relative", overflow: "hidden" }}>
        {/* Left: SVG Canvas wrapper */}
        <div style={{ flex: 1, position: "relative", height: "100%", overflow: "hidden" }}>
          <CareerMindmap
            treeData={scaffoldTree}
            nodeStates={nodeStates}
            expandedNodeIds={expandedNodeIds}
            setExpandedNodeIds={setExpandedNodeIds}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            onCanvasClick={handleCanvasClick}
            activeNode={activeNode}
            profile={profile}
          />

          {/* Legend overlay */}
          {showLegend && (
            <div
              style={{
                position: "absolute",
                bottom: 20,
                left: 20,
                background: "rgba(255, 255, 255, 0.92)",
                border: "1px solid #e2e8f0",
                borderRadius: 12,
                padding: "12px 16px",
                backdropFilter: "blur(12px)",
                zIndex: 50,
                minWidth: 180,
                boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
              }}
            >
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 8, marginTop: 0 }}>
                Node Legend
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {LEGEND.map(({ type, label }) => (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 99, background: SCAFFOLD_COLORS[type] || "#6b7280", flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: "#475569", fontWeight: 500 }}>{label}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 99, background: "#10b981", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#475569", fontWeight: 500 }}>Completed</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 99, background: "#3b82f6", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#475569", fontWeight: 500 }}>In Progress</span>
                </div>
              </div>
            </div>
          )}

          {/* User path indicator */}
          <div
            style={{
              position: "absolute",
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(124, 58, 237, 0.08)",
              border: "1px solid rgba(124, 58, 237, 0.25)",
              borderRadius: 20,
              padding: "4px 14px",
              fontSize: 11,
              fontWeight: 600,
              color: "#6d28d9",
              zIndex: 50,
              backdropFilter: "blur(8px)",
              userSelect: "none",
              boxShadow: "0 2px 10px rgba(124, 58, 237, 0.06)",
            }}
          >
            {profile?.name || "User"}&apos;s path · {profile?.goal?.description || "Career Goal"}
          </div>
        </div>

        {/* Right Sidebar Popover */}
        <div style={{ width: 380, height: "100%", flexShrink: 0, borderLeft: "1px solid #e2e8f0", zIndex: 10 }}>
          <MindmapNodePopover
            node={activeNode}
            nodeContent={activeNode ? nodeCache[activeNode.id] : null}
            onClose={handleClosePopover}
            completedGoals={completedGoals}
            onToggleGoal={handleToggleGoal}
            disabled={activeNode ? (nodeStates[activeNode.id] || activeNode.state) === "locked" : true}
            profile={profile}
            userSelections={userSelections}
            onSelectOption={handleSelectOption}
          />
        </div>
      </div>

      {/* Feature 7 — Checkpoint side panel */}
      {showCheckpoint && (
        <CheckpointPanel
          checkpointLabel={checkpointLabel}
          profile={profile}
          checkpointData={checkpointData}
          onClose={() => setShowCheckpoint(false)}
        />
      )}
    </div>
  );
}
