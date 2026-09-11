import { useState, useMemo, useCallback } from "react";
import { GradientBackground } from "@/components/ui/gradient-background";
import DecisionTree from "./DecisionTree";
import {
  loadCompletedMilestones,
  saveCompletedMilestones,
  loadDeepRoadmap,
  loadFinancialTier,
  saveFinancialTier,
  loadCompletedDeepWeeks,
  saveCompletedDeepWeeks,
} from "../../services/localStorageService";

const tierLabels = {
  HIGH: "Self-funded",
  MEDIUM: "Affordable",
  LOW: "Free only",
};

const tierAccent = {
  HIGH: "bg-coral text-white",
  MEDIUM: "bg-ocean text-white",
  LOW: "bg-emerald-600 text-white",
};

export default function DecisionTreeView({
  profile,
  roadmap,
  onGoToDashboard,
}) {
  const [financialTier, setFinancialTier] = useState(
    () => loadFinancialTier() || profile.financialTier || "HIGH"
  );
  const [completedMilestones, setCompletedMilestones] = useState(
    () => new Set(loadCompletedMilestones())
  );
  const [deepRoadmap] = useState(() => loadDeepRoadmap());
  const [completedDeepWeeks, setCompletedDeepWeeks] = useState(() => loadCompletedDeepWeeks());

  const toggleMilestone = useCallback((milestoneId) => {
    setCompletedMilestones((current) => {
      const next = new Set(current);
      if (next.has(milestoneId)) {
        // Unchecking
        next.delete(milestoneId);
        
        // Cascade uncheck logic (same as in RoadmapDashboard.jsx)
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

  const toggleDeepWeek = useCallback((weekId) => {
    setCompletedDeepWeeks((current) => {
      const next = current.includes(weekId)
        ? current.filter((id) => id !== weekId)
        : [...current, weekId];
      saveCompletedDeepWeeks(next);
      return next;
    });
  }, []);

  const updateTier = (nextTier) => {
    setFinancialTier(nextTier);
    saveFinancialTier(nextTier);
  };

  const treeData = useMemo(() => {
    if (!deepRoadmap || !deepRoadmap.weeklyStudyPlan || !deepRoadmap.weeklyStudyPlan.length) {
      return roadmap.decisionTree;
    }

    const clonedTree = JSON.parse(JSON.stringify(roadmap.decisionTree));

    const deepBranch = {
      id: "deep-root",
      label: "Deep Optimization",
      type: "alternate",
      month: "Phase 2",
      detail: "Your customized 6-Week Intensive Study Plan based on your advanced goals and strengths.",
      financialTiers: ["LOW", "MEDIUM", "HIGH"],
      status: "in_progress",
      children: [],
    };

    let currentParent = deepBranch;
    deepRoadmap.weeklyStudyPlan.forEach((weekItem) => {
      const node = {
        id: weekItem.week,
        label: weekItem.week,
        type: "milestone",
        month: weekItem.week,
        detail: `${weekItem.topic} | Task: ${weekItem.actionItem} (Resource: ${weekItem.resource})`,
        financialTiers: ["LOW", "MEDIUM", "HIGH"],
        status: completedDeepWeeks.includes(weekItem.week) ? "completed" : "not_started",
        children: [],
      };
      currentParent.children.push(node);
      currentParent = node;
    });

    if (clonedTree.id === "root-now") {
      clonedTree.children = clonedTree.children || [];
      clonedTree.children.push(deepBranch);
    }

    return clonedTree;
  }, [roadmap.decisionTree, deepRoadmap, completedDeepWeeks]);

  return (
    <GradientBackground
      className="bg-transparent min-h-screen relative flex flex-col font-sans text-slate-800 animate-fade-in"
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
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-bold text-emerald-800">
            <span>Decision Tree View</span>
          </div>
        </div>

        <div className="hidden md:flex flex-col text-center">
          <h1 className="text-sm font-extrabold text-slate-900 tracking-wide uppercase">
            Career Path Decision Tree
          </h1>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Interactive visualization of your path options and milestones
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mr-1 hidden sm:inline">
            Financial tier:
          </span>
          {Object.entries(tierLabels).map(([tier, label]) => (
            <button
              key={tier}
              className={`focus-ring rounded-md px-2.5 py-1.5 text-xs font-bold transition-all duration-200 ${
                financialTier === tier
                  ? tierAccent[tier]
                  : "bg-black/5 text-slate-700 hover:bg-black/10 hover:text-slate-900"
              }`}
              type="button"
              onClick={() => updateTier(tier)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ━━━ Main Body ━━━ */}
      <main className="flex-1 p-5 md:p-8 flex flex-col">
        <div className="mx-auto w-full max-w-[1600px] flex-1 flex flex-col">
          <div className="rounded-xl border border-black/8 bg-white/55 p-6 backdrop-blur-md shadow-sm flex-1 flex flex-col">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-slate-900">Interactive Pathway Tree</h2>
              <p className="text-xs text-slate-600 mt-1">
                Click milestone nodes to expand/collapse and update progress. Drag to pan and scroll to zoom.
              </p>
            </div>
            <div className="flex-1 min-h-[500px] relative rounded-lg border border-slate-200/60 bg-white overflow-hidden">
              <DecisionTree
                treeData={treeData}
                financialTier={financialTier}
                completedMilestones={completedMilestones}
                onToggleMilestone={toggleMilestone}
                completedDeepWeeks={completedDeepWeeks}
                onToggleDeepWeek={toggleDeepWeek}
              />
            </div>
          </div>
        </div>
      </main>
    </GradientBackground>
  );
}
