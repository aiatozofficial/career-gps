import { useMemo, useState, useCallback, useEffect } from "react";
import { GradientBackground } from "@/components/ui/gradient-background";
import {
  clearCareerGpsStorage,
  loadCompletedMilestones,
  saveCompletedMilestones,
  saveFinancialTier,
  loadDeepRoadmap,
  saveDeepRoadmap,
  loadResumeAnalysis,
  loadCompletedDeepWeeks,
  saveCompletedDeepWeeks,
  // New local storage cache and states
  loadNodeCache,
  saveNodeCache,
  loadNodeStates,
  saveNodeStates,
  loadCompletedGoalsList,
  saveCompletedGoalsList,
  loadUserSelections,
  saveUserSelections,
  loadSelProgression,
  saveSelProgression,
  loadSelMastersTier,
  saveSelMastersTier
} from "../../services/localStorageService";

import {
  filterByFinancialTier,
  getAllMilestones,
  getFieldLabel,
  getProgressStats,
  getStageLabel,
} from "../../utils/roadmapHelpers";
import {
  buildMindmapScaffold,
  flattenScaffold,
  calculateProgress,
  getSelectionOptions,
  getBoardSelectionParts,
  getBoardSelectionValue,
  getTieredSelectionParts
} from "../../data/scaffoldBuilder";
import DeepOptimizationWizard from "./DeepOptimizationWizard";
import ResumeAnalyzer from "../pathforge/ResumeAnalyzer";
import MarketIntelligence from "../pathforge/MarketIntelligence";
import CareerChat from "../pathforge/CareerChat";
import SkillMap from "../pathforge/SkillMap";

const sections = [
  ["goals", "Goals"],
  ["courses", "Courses"],
  ["internships", "Internships"],
  ["certifications", "Certifications"],
  ["alternates", "Alternate Paths"],
  ["skills", "Skill Gap"],
  ["resume", "Resume Analyzer"],
  ["market", "Market Intel"],
  ["chat", "AI Career Chat"],
  ["deep", "Deep Insights"],
];

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

export default function RoadmapDashboard({ profile, roadmap, initialFinancialTier, onReset, onViewTimeline, onViewMindmap, onProfileUpdate }) {
  const [activeSection, setActiveSection] = useState("goals");
  const [financialTier, setFinancialTier] = useState(initialFinancialTier || profile.financialTier);
  const [selectedAlternate, setSelectedAlternate] = useState(null);
  const [completedMilestones, setCompletedMilestones] = useState(() => new Set(loadCompletedMilestones()));
  const [deepRoadmap, setDeepRoadmap] = useState(() => loadDeepRoadmap());
  const [resumeAnalysis, setResumeAnalysis] = useState(() => loadResumeAnalysis());
  const [showWizard, setShowWizard] = useState(false);
  const [completedDeepWeeks, setCompletedDeepWeeks] = useState(() => loadCompletedDeepWeeks());

  // Onboarding Choice Wizard States
  const [wizardOpenNodeId, setWizardOpenNodeId] = useState(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [manuallyClosedId, setManuallyClosedId] = useState(null);
  const [selBoard, setSelBoard] = useState("");
  const [selStream, setSelStream] = useState("");
  const [selTier, setSelTier] = useState("");
  const [selUgCourse, setSelUgCourse] = useState("");
  const [selPgChoice, setSelPgChoice] = useState("");
  const [selProgression, setSelProgression] = useState("");
  const [selMastersTier, setSelMastersTier] = useState("");
  const [selMastersCourse, setSelMastersCourse] = useState("");

  // Mindmap stage-locked lazy state loaded from storage
  const [completedGoals, setCompletedGoals] = useState(() => new Set(loadCompletedGoalsList()));
  const [nodeCache, setNodeCache] = useState(() => loadNodeCache());
  const [nodeStates, setNodeStates] = useState(() => loadNodeStates());
  const [userSelections, setUserSelections] = useState(() => loadUserSelections());

  // Reset wizard states when active selection node changes
  useEffect(() => {
    if (wizardOpenNodeId) {
      const existingSelection = (userSelections || {})[wizardOpenNodeId] || "";
      setWizardStep(1);
      setSelBoard("");
      setSelStream("");
      setSelTier("");
      setSelUgCourse("");
      setSelPgChoice("");
      setSelProgression("");
      setSelMastersTier("");
      setSelMastersCourse("");

      if (wizardOpenNodeId === "node-board-select") {
        const parts = getBoardSelectionParts(existingSelection, profile);
        setSelBoard(parts.board);
        setSelStream(parts.stream);
        if (parts.board && parts.board !== "Polytechnic Diploma" && parts.stream) {
          setWizardStep(2);
        }
      } else if (wizardOpenNodeId === "node-ug-select") {
        const parts = getTieredSelectionParts(existingSelection);
        setSelTier(parts.tier);
        setSelUgCourse(parts.course);
        if (parts.tier && parts.course) {
          setWizardStep(2);
        }
      } else if (wizardOpenNodeId === "node-postgrad-select") {
        setSelPgChoice(existingSelection);
        const savedProgression = loadSelProgression(profile.name);
        setSelProgression(savedProgression);
        if (existingSelection === "→ Enter Workforce" && savedProgression) {
          setWizardStep(2);
        }
      } else if (wizardOpenNodeId === "node-masters-select") {
        setSelMastersCourse(existingSelection);
        const savedTier = loadSelMastersTier(profile.name);
        setSelMastersTier(savedTier);
        if (savedTier && existingSelection) {
          setWizardStep(2);
        }
      }
    }
  }, [wizardOpenNodeId, userSelections, profile]);

  // Reevaluate node states
  const reevaluateStates = useCallback((currentGoals, currentSelections, currentCache, currentStates) => {
    const root = buildMindmapScaffold(profile, {}, currentSelections);
    const flat = flattenScaffold(root);
    const nextStates = {};

    nextStates["node-root"] = "completed";

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
            const childSelection = (currentSelections || {})[child.id];
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

  const handleToggleGoal = useCallback((goalText) => {
    setCompletedGoals(prev => {
      const next = new Set(prev);
      if (next.has(goalText)) {
        next.delete(goalText);
      } else {
        next.add(goalText);
      }
      
      const list = Array.from(next);
      saveCompletedGoalsList(list);

      // Propagate locks / unlocks downwards
      const updatedStates = reevaluateStates(next, userSelections, nodeCache, nodeStates);
      setNodeStates(updatedStates);
      saveNodeStates(updatedStates);
      return next;
    });
  }, [nodeCache, nodeStates, userSelections, reevaluateStates]);

  const flatScaffold = useMemo(() => {
    const root = buildMindmapScaffold(profile, nodeStates, userSelections);
    return flattenScaffold(root);
  }, [profile, nodeStates, userSelections]);

  const handleSelectOption = useCallback((nodeId, option) => {
    setUserSelections(prev => {
      const next = { ...prev };
      if (option === undefined) {
        delete next[nodeId];
      } else {
        next[nodeId] = option;
      }
      saveUserSelections(next);

      // Re-evaluate node states with the updated selections
      setTimeout(() => {
        setNodeStates(oldStates => {
          const nextStates = reevaluateStates(completedGoals, next, nodeCache, oldStates);
          if (option === undefined) {
            nextStates[nodeId] = "unlocked";
          } else {
            nextStates[nodeId] = "completed";
          }
          saveNodeStates(nextStates);
          return nextStates;
        });
      }, 0);

      return next;
    });
  }, [completedGoals, nodeCache, reevaluateStates]);

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

  const currentPhase = profile.onboardingPhase || 1;
  const phaseCompleted = useMemo(() => {
    const milestones = roadmap.goalsToAchieve?.milestones || [];
    if (!milestones.length) return false;
    return milestones.every((ms) => completedMilestones.has(ms.id));
  }, [roadmap, completedMilestones]);

  const filtered = useMemo(
    () => ({
      courses: filterByFinancialTier(roadmap.collegeCourses, financialTier),
      internships: filterByFinancialTier(roadmap.internships, financialTier),
      certifications: filterByFinancialTier(roadmap.certifications, financialTier),
    }),
    [roadmap, financialTier],
  );

  const filteredSections = useMemo(() => {
    const isSchool = profile.stage === "CLASS_7_8" || profile.stage === "CLASS_9_10";
    if (isSchool) {
      return sections.filter(([id]) => id !== "courses" && id !== "internships" && id !== "certifications");
    }
    return sections;
  }, [profile.stage]);

  const milestoneCount = getAllMilestones(roadmap).length;

  const wizardNode = useMemo(() => {
    return flatScaffold.find(n => n.id === wizardOpenNodeId);
  }, [flatScaffold, wizardOpenNodeId]);

  const allPrecedingGoalsCompleted = useMemo(() => {
    // Filter nodes that are unlocked/in progress/completed
    const activeNodes = flatScaffold.filter(n => {
      const state = (nodeStates || {})[n.id] || n.state;
      if (state === "locked") return false;
      // Skip checkpoints and choice/selection points completely from the checklist list
      if (n.isCheckpoint || n.isSelectionPoint || n.type === "selection") return false;
      return true;
    });

    return activeNodes.every(n => {
      if (n.id === "node-root") return true;
      const content = (nodeCache || {})[n.id];
      if (!content || !content.goals || content.goals.length === 0) {
        return false; // If content hasn't loaded yet, treat it as not completed
      }
      const goalsList = content.goals;
      return goalsList.every(g => completedGoals.has(g));
    });
  }, [flatScaffold, nodeStates, nodeCache, completedGoals]);

  // Close choice wizard modal if selection nodes are no longer active or preceding goals are not complete
  useEffect(() => {
    const activeSelNode = flatScaffold.find(n => {
      if (!n.isSelectionPoint) return false;
      const state = (nodeStates || {})[n.id] || n.state;
      return state === "unlocked" || state === "in_progress";
    });
    
    if (!activeSelNode || !allPrecedingGoalsCompleted) {
      setWizardOpenNodeId(null);
    }
  }, [nodeStates, allPrecedingGoalsCompleted, flatScaffold]);

  // Recommended calculations based on profile
  const fieldType = profile.field?.type || "TECH";
  let recUg = "B.Tech / B.E. (Computer Science/IT)";
  if (fieldType === "SCIENCE") recUg = "B.Sc (Sciences/Biotech)";
  else if (fieldType === "COMMERCE") recUg = "B.Com / BBA (Business/Finance)";
  else if (fieldType === "LAW" || fieldType === "ARTS") recUg = "BA (Arts/Humanities/Law)";
  else if (fieldType === "MEDICINE") recUg = "MBBS / BDS (Medicine)";

  let recPg = "→ Enter Workforce";
  if (profile.goal?.type === "HIGHER_STUDIES") recPg = "→ Masters Degree";

  let recPgCourse = "M.Tech / MS (Computer Science/IT)";
  if (fieldType === "SCIENCE") recPgCourse = "M.Sc (Sciences)";
  else if (fieldType === "COMMERCE") recPgCourse = "MBA (Management/Finance)";
  else if (fieldType === "LAW" || fieldType === "ARTS") recPgCourse = "MA (Arts/Humanities/Law)";

  const boardSelectionOptions = useMemo(() => {
    return getSelectionOptions("node-board-select", profile);
  }, [profile]);

  const boardOptions = useMemo(() => {
    const byBoard = new Map();
    boardSelectionOptions.forEach(opt => {
      if (!byBoard.has(opt.board)) {
        byBoard.set(opt.board, {
          value: opt.board,
          title: opt.board === "CBSE"
            ? "CBSE Board"
            : opt.board === "State Board (Inter)"
            ? "State Board / Intermediate"
            : "Polytechnic Diploma",
          desc: opt.board === "CBSE"
            ? "Central Board of Secondary Education. Standardized curriculum, ideal for competitive prep."
            : opt.board === "State Board (Inter)"
            ? "Region-specific curriculum, focused on state university tracks."
            : "A technical/vocational pathway leading directly into practical domains."
        });
      }
    });
    return Array.from(byBoard.values());
  }, [boardSelectionOptions]);

  const boardStreamOptions = useMemo(() => {
    return boardSelectionOptions
      .filter(opt => opt.board === selBoard && opt.stream)
      .map(opt => ({
        value: opt.stream,
        title: opt.stream,
        desc: opt.desc,
      }));
  }, [boardSelectionOptions, selBoard]);

  const ugCourseOptions = useMemo(() => {
    const fieldType = profile.field?.type || "TECH";
    if (fieldType === "TECH") {
      return [
        { value: "B.Tech / B.E. (Computer Science/IT)", title: "B.Tech / B.E. (Computer Science/IT)", desc: "Core software engineering, algorithms, computing architecture." },
        { value: "BCA / B.Sc (Computer Science)", title: "BCA / B.Sc (Computer Science)", desc: "Applied computing, application development, and database systems." },
        { value: "B.Tech / B.E. (Electronics / Allied)", title: "B.Tech / B.E. (Electronics / Allied)", desc: "Hardware-software integration, embedded systems, and communication protocols." },
      ];
    } else if (fieldType === "MEDICINE") {
      return [
        { value: "MBBS / BDS (Medicine)", title: "MBBS / BDS (Medicine)", desc: "Clinical practice, surgical fundamentals, biology core." },
        { value: "B.Sc (Sciences/Biotech)", title: "B.Sc (Sciences/Biotech)", desc: "Scientific principles, life sciences, chemical/biological disciplines." },
        { value: "B.Tech (Bioinformatics / Biomedical)", title: "B.Tech (Bioinformatics / Biomedical)", desc: "Applied technology in health sciences, medical diagnostics." },
      ];
    } else if (fieldType === "COMMERCE") {
      return [
        { value: "B.Com / BBA (Business/Finance)", title: "B.Com / BBA (Business/Finance)", desc: "Corporate management, accounts, micro/macro economics." },
        { value: "B.Com (Honors / Corporate Finance)", title: "B.Com (Honors / Corporate Finance)", desc: "Advanced accounting, corporate finance, valuation, and business law." },
        { value: "B.Sc (Economics / Statistics)", title: "B.Sc (Economics / Statistics)", desc: "Quantitative economics, mathematical modeling, and financial analytics." },
      ];
    } else if (fieldType === "LAW") {
      return [
        { value: "BA (Arts/Humanities/Law)", title: "BA (Arts/Humanities/Law)", desc: "Humanities studies, corporate/IP law, design tracks." },
        { value: "BA LLB (Integrated Law)", title: "BA LLB (Integrated Law)", desc: "Integrated legal studies, constitutional law, and humanities." },
        { value: "BBA LLB (Business Law)", title: "BBA LLB (Business Law)", desc: "Corporate laws, mergers and acquisitions, and business management." },
      ];
    } else if (fieldType === "DESIGN" || fieldType === "ARTS") {
      return [
        { value: "B.Des (Design / UX/UI)", title: "B.Des (Design / UX/UI)", desc: "Visual communication, product design, and UX/UI research." },
        { value: "BA (Fine Arts / Content Strategy)", title: "BA (Fine Arts / Content Strategy)", desc: "Media, communications, creative writing, and digital arts." },
        { value: "B.Sc (Multimedia / Game Design)", title: "B.Sc (Multimedia / Game Design)", desc: "Game design, 3D modeling, and interactive media systems." },
      ];
    } else {
      return [
        { value: "B.Tech / B.E. (Computer Science/IT)", title: "B.Tech / B.E. (Computer Science/IT)", desc: "Core software engineering, algorithms, computing architecture." },
        { value: "B.Sc (Sciences/Biotech)", title: "B.Sc (Sciences/Biotech)", desc: "Scientific principles, life sciences, chemical/biological disciplines." },
        { value: "B.Com / BBA (Business/Finance)", title: "B.Com / BBA (Business/Finance)", desc: "Corporate management, accounts, micro/macro economics." },
      ];
    }
  }, [profile]);

  const pgCourseOptions = useMemo(() => {
    const fieldType = profile.field?.type || "TECH";
    if (fieldType === "TECH") {
      return [
        { value: "M.Tech / MS (Computer Science/IT)", title: "M.Tech / MS (Computer Science/IT)", desc: "Advanced systems engineering, algorithms, AI/ML specialization.", isTech: true },
        { value: "MCA (Computer Applications)", title: "MCA (Computer Applications)", desc: "Advanced application design, database administration, and web systems.", isTech: true },
        { value: "MBA (Technology Management)", title: "MBA (Technology Management)", desc: "Leadership in technology, product management, and systems engineering.", isTech: false },
      ];
    } else if (fieldType === "MEDICINE") {
      return [
        { value: "MD / MS (Clinical Specialization)", title: "MD / MS (Clinical Specialization)", desc: "Advanced clinical practice, surgical methods, hospital residency.", isTech: false },
        { value: "M.Sc (Sciences)", title: "M.Sc (Sciences)", desc: "Advanced scientific research, biotechnology lab specialties.", isTech: true },
        { value: "M.Pharma / MBA (Healthcare)", title: "M.Pharma / MBA (Healthcare)", desc: "Pharmaceutical administration, clinical trials management, healthcare admin.", isTech: false },
      ];
    } else if (fieldType === "COMMERCE") {
      return [
        { value: "MBA (Management/Finance)", title: "MBA (Management/Finance)", desc: "Corporate strategy, financial modeling, organizational leadership.", isTech: false },
        { value: "M.Com (Advanced Accounting)", title: "M.Com (Advanced Accounting)", desc: "Corporate taxation, auditing theory, and corporate regulations.", isTech: false },
        { value: "M.Sc (Financial Engineering)", title: "M.Sc (Financial Engineering)", desc: "Quantitative finance, risk management, and algorithmic trading.", isTech: true },
      ];
    } else if (fieldType === "LAW") {
      return [
        { value: "MA (Arts/Humanities/Law)", title: "MA (Arts/Humanities/Law)", desc: "IP law, legal litigation, media, creative communications.", isTech: false },
        { value: "LLM (Corporate & IP Law)", title: "LLM (Corporate & IP Law)", desc: "Intellectual property law, legal litigation, media, creative communications.", isTech: false },
        { value: "MBA (Legal Studies / Compliance)", title: "MBA (Legal Studies / Compliance)", desc: "Corporate compliance, business ethics, and governance.", isTech: false },
      ];
    } else if (fieldType === "DESIGN" || fieldType === "ARTS") {
      return [
        { value: "M.Des (Interaction / UX Design)", title: "M.Des (Interaction / UX Design)", desc: "User experience research, system architecture, human-computer interaction.", isTech: false },
        { value: "MA (Creative Communications)", title: "MA (Creative Communications)", desc: "Content strategy, digital marketing, public relations.", isTech: false },
        { value: "M.Sc (Information Design / Data Viz)", title: "M.Sc (Information Design / Data Viz)", desc: "Visualizing complex data, dashboard design, info graphics.", isTech: false },
      ];
    } else {
      return [
        { value: "M.Tech / MS (Computer Science/IT)", title: "M.Tech / MS (Computer Science/IT)", desc: "Advanced systems engineering, algorithms, AI/ML specialization.", isTech: true },
        { value: "MBA (Management/Finance)", title: "MBA (Management/Finance)", desc: "Corporate strategy, financial modeling, organizational leadership.", isTech: false },
        { value: "M.Sc (Sciences)", title: "M.Sc (Sciences)", desc: "Advanced scientific research, biotechnology lab specialties.", isTech: true },
      ];
    }
  }, [profile]);
  
  // Calculate progress statistics relative to the unlocked mindmap path
  const progressStats = useMemo(() => {
    const root = buildMindmapScaffold(profile, nodeStates, userSelections);
    const mmStats = calculateProgress(root, nodeCache, nodeStates, completedGoals);
    
    // Add deep assessment progression if active
    if (!deepRoadmap || !deepRoadmap.weeklyStudyPlan || !deepRoadmap.weeklyStudyPlan.length) {
      return {
        total: mmStats.totalCount || 1,
        completed: mmStats.completedCount,
        percentage: mmStats.percent,
        byPhase: []
      };
    }

    const deepWeeks = deepRoadmap.weeklyStudyPlan;
    const deepTotal = deepWeeks.length;
    const deepCompleted = deepWeeks.filter((w) => completedDeepWeeks.includes(w.week)).length;

    const total = (mmStats.totalCount || 0) + deepTotal;
    const completed = mmStats.completedCount + deepCompleted;
    const percentage = total ? Math.round((completed / total) * 100) : 0;

    const byPhase = [
      ...baseStats.byPhase,
      {
        phase: "deepStudy",
        total: deepTotal,
        completed: deepCompleted,
        percentage: deepPercentage,
      },
    ];

    return {
      ...baseStats,
      total,
      completed,
      percentage,
      byPhase,
    };
  }, [roadmap, completedMilestones, deepRoadmap, completedDeepWeeks]);

  function toggleMilestone(milestoneId) {
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
  }

  const toggleDeepWeek = (weekId) => {
    setCompletedDeepWeeks((current) => {
      const next = current.includes(weekId)
        ? current.filter((id) => id !== weekId)
        : [...current, weekId];
      saveCompletedDeepWeeks(next);
      return next;
    });
  };


  function updateTier(nextTier) {
    setFinancialTier(nextTier);
    saveFinancialTier(nextTier);
  }

  function handleReset() {
    // clearCareerGpsStorage() now covers career-gps:completed-deep-weeks too
    clearCareerGpsStorage();
    onReset();
  }

  function handlePrint() {
    try {
      const win = window.open("", "_blank");
      if (!win) {
        window.print();
        return;
      }
      const esc = (s) => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      const stageLabel = getStageLabel ? getStageLabel(profile.stage) : profile.stage;
      const fieldLabel = getFieldLabel ? getFieldLabel(profile.field) : (profile.field?.type || "");
      const tierLabel = (tierLabels[financialTier] || financialTier);
      const milestones = roadmap?.goalsToAchieve?.milestones || [];
      const courses = filtered?.courses || [];
      const internships = filtered?.internships || [];
      const certs = filtered?.certifications || [];
      const alternates = roadmap?.alternatePaths || [];
      const have = roadmap?.skillGap?.have || profile.skills || [];
      const need = roadmap?.skillGap?.need || [];
      const bridging = roadmap?.skillGap?.bridgingSteps || [];
      // Build mindmap expanded list for print (same logic as print view)
      let mindmapHtml = "";
      try {
        const scaffold = buildMindmapScaffold(profile, nodeStates, userSelections);
        const flat = flattenScaffold(scaffold);
        const nodesForPrint = flat.filter(n => {
          const st = (nodeStates || {})[n.id] || n.state;
          if (st === "locked") return false;
          if (n.isSelectionPoint || n.type === "selection") return false;
          const c = (nodeCache || {})[n.id];
          return c && ((c.goals && c.goals.length>0) || (c.achievements && c.achievements.length>0));
        });
        if (nodesForPrint.length>0) {
          mindmapHtml = `<h2 style="font-size:18px;font-weight:800;border-left:4px solid #8b5cf6;padding-left:10px;margin:24px 0 12px">Mindmap — Stage Goals (Expanded)</h2>`;
          mindmapHtml += nodesForPrint.map(node => {
            const c = (nodeCache || {})[node.id];
            const goals = (c.goals||[]).map(g=>`<li style="font-size:12px;margin:4px 0"><span style="color:#059669">✓</span> ${esc(g)}</li>`).join("");
            const ach = (c.achievements||[]).map(a=>`<li style="font-size:12px;margin:4px 0;color:#92400e">⭐ ${esc(a)}</li>`).join("");
            const skills = c.skills ? `<p style="font-size:11px;margin-top:6px"><b>Skills:</b> ${esc(c.skills.join(", "))}</p>` : "";
            return `<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:10px;break-inside:avoid"><h3 style="font-size:13px;font-weight:700">${esc(node.label)} <span style="font-weight:400;color:#64748b">(${esc(node.timeframe)})</span></h3>${c.summary?`<p style="font-size:11px;color:#475569;font-style:italic;margin-top:4px">${esc(c.summary)}</p>`:""}${goals?`<ul style="margin-top:8px;padding-left:16px">${goals}</ul>`:""}${ach?`<ul style="margin-top:8px;padding-left:16px">${ach}</ul>`:""}${skills}</div>`;
          }).join("");
        }
      } catch(e){ mindmapHtml = `<p style="font-size:12px;color:#94a3b8">Mindmap details not yet loaded.</p>`; }

      const coursesHtml = courses.length? courses.map(c=>`<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:8px;break-inside:avoid"><h3 style="font-size:13px;font-weight:700">${esc(c.name)}</h3><p style="font-size:11px;color:#475569">Semester: ${esc(c.semester)}</p><p style="font-size:11px;color:#334155;margin-top:4px">${esc(c.reason)}</p></div>`).join("") : `<p style="font-size:12px;color:#94a3b8;font-style:italic">No courses for current tier/stage.</p>`;
      const internHtml = internships.length? internships.map(it=>`<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:8px;break-inside:avoid"><h3 style="font-size:13px;font-weight:700">${esc(it.role)}</h3><p style="font-size:11px;color:#475569">When: ${esc(it.when)} • Platforms: ${esc((it.platforms||[]).join(", "))} • ${esc(it.stipendNote)}</p></div>`).join("") : `<p style="font-size:12px;color:#94a3b8;font-style:italic">No internships for current tier.</p>`;
      const certsHtml = certs.length? certs.map(c=>`<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:8px;break-inside:avoid"><h3 style="font-size:13px;font-weight:700">${esc(c.name)}</h3><p style="font-size:11px;color:#475569">Platform: ${esc(c.platform)} • Cost: ${esc(c.cost)} • Duration: ${esc(c.duration)}</p><p style="font-size:11px;color:#334155;margin-top:4px">${esc(c.impact)}</p></div>`).join("") : `<p style="font-size:12px;color:#94a3b8;font-style:italic">No certifications for current tier.</p>`;
      const altHtml = alternates.length? alternates.map(a=>`<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:8px;break-inside:avoid"><h3 style="font-size:13px;font-weight:700">${esc(a.title)} <span style="font-weight:400;color:#64748b">(${esc(a.salaryRange)})</span></h3><p style="font-size:11px;color:#475569">Skill Overlap: ${a.skillOverlap}% • Pivot: ${esc(a.pivotRequired)}</p></div>`).join("") : `<p style="font-size:12px;color:#94a3b8">No alternate paths.</p>`;
      const needStr = need.map(n=> typeof n==="string"? n : (n.skill||JSON.stringify(n))).join(", ");
      const deep = deepRoadmap;
      let deepHtml = "";
      if (deep) {
        deepHtml = `<h2 style="font-size:18px;font-weight:800;border-left:4px solid #10b981;padding-left:10px;margin:24px 0 12px">Deep Insights — 6-Week Plan & Projects</h2>`;
        if (deep.weeklyStudyPlan) deepHtml += deep.weeklyStudyPlan.map(w=>`<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:8px;break-inside:avoid"><h3 style="font-size:13px;font-weight:700">${esc(w.week)}: ${esc(w.topic)}</h3><p style="font-size:11px;color:#475569">Resource: ${esc(w.resource)}</p><p style="font-size:11px;margin-top:4px">Task: ${esc(w.actionItem)}</p></div>`).join("");
        if (deep.targetProjects) deepHtml += `<div style="margin-top:12px">`+deep.targetProjects.map((p,i)=>`<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:8px;break-inside:avoid"><h3 style="font-size:13px;font-weight:700">${esc(p.title)} <span style="font-weight:400;color:#64748b">(${esc(p.techStack)})</span></h3><p style="font-size:11px;color:#334155;margin-top:4px">${esc(p.description)}</p><ol style="font-size:11px;margin-left:18px;margin-top:6px">${(p.phases||[]).map(ph=>`<li>${esc(ph)}</li>`).join("")}</ol></div>`).join("")+`</div>`;
        if (deep.strategicAdvice) deepHtml += `<p style="font-size:11px;font-style:italic;color:#334155;border-left:3px solid #6ee7b7;padding-left:10px;margin-top:12px">${esc(deep.strategicAdvice)}</p>`;
      }

      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Career GPS — ${esc(profile.name)} Career Guide</title><style> *{box-sizing:border-box} body{font-family: Inter, -apple-system, Arial, sans-serif; color:#0f172a; margin:0; padding:24px; background:white} h1{font-size:28px} h2{page-break-after:avoid} @media print{ body{padding:0} button{display:none} } </style></head><body>
      <div style="border-bottom:2px solid #0f172a;padding-bottom:16px;margin-bottom:20px">
        <h1 style="margin:0">Career GPS — Career Guide</h1>
        <p style="font-size:12px;color:#475569;margin:4px 0">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} • Career GPS</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;margin-top:10px">
          <div><b>Name:</b> ${esc(profile.name)}</div>
          <div><b>Stage:</b> ${esc(stageLabel)}</div>
          <div><b>Field:</b> ${esc(fieldLabel)}</div>
          <div><b>Financial Tier:</b> ${esc(tierLabel)}</div>
          <div style="grid-column:1 / -1"><b>Goal Direction:</b> ${esc(formatGoalType(profile.goal.type))} — ${esc(profile.goal.description)}</div>
          <div style="grid-column:1 / -1"><b>Skills:</b> ${esc((profile.skills||[]).join(", ")||"None")}</div>
        </div>
      </div>

      <h2 style="font-size:18px;font-weight:800;border-left:4px solid #10b981;padding-left:10px;margin:18px 0 12px">Goals to Achieve</h2>
      <p style="font-size:12px;color:#475569;margin-bottom:10px">${esc(roadmap.goalsToAchieve?.description||"")}</p>
      <div>${milestones.map(ms=>`<div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:10px;break-inside:avoid"><div style="display:flex;justify-content:space-between;gap:8px"><h3 style="font-size:13px;font-weight:700;margin:0">${esc(ms.title)}</h3><span style="font-size:11px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:999px;padding:2px 8px;white-space:nowrap">${esc(ms.timeframe)}</span></div><p style="font-size:11px;color:#334155;margin-top:6px">${esc(ms.detail)}</p>${ms.prerequisites && ms.prerequisites.length?`<ul style="font-size:11px;margin-top:8px;padding-left:16px">${ms.prerequisites.map(pre=>`<li><b>${esc(pre.title)}:</b> ${esc(pre.detail)}</li>`).join("")}</ul>`:""}</div>`).join("")}</div>

      ${mindmapHtml}

      <h2 style="font-size:18px;font-weight:800;border-left:4px solid #0ea5e9;padding-left:10px;margin:24px 0 12px">College Courses</h2>
      ${coursesHtml}

      <h2 style="font-size:18px;font-weight:800;border-left:4px solid #f97316;padding-left:10px;margin:24px 0 12px">Internships</h2>
      ${internHtml}

      <h2 style="font-size:18px;font-weight:800;border-left:4px solid #f59e0b;padding-left:10px;margin:24px 0 12px">Certifications</h2>
      ${certsHtml}

      <h2 style="font-size:18px;font-weight:800;border-left:4px solid #334155;padding-left:10px;margin:24px 0 12px">Alternate Paths</h2>
      ${altHtml}

      <h2 style="font-size:18px;font-weight:800;border-left:4px solid #059669;padding-left:10px;margin:24px 0 12px">Skill Gap</h2>
      <div style="font-size:12px;break-inside:avoid">
        <p><b>Have:</b> ${esc(have.join(", ")||"None")}</p>
        <p style="margin-top:6px"><b>Need:</b> ${esc(needStr||"None")}</p>
        ${bridging.length?`<ul style="margin-top:8px;padding-left:16px">${bridging.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>`:""}
      </div>

      ${deepHtml}

      <div style="border-top:1px solid #cbd5e1;margin-top:24px;padding-top:12px;text-align:center;font-size:11px;color:#64748b">Career GPS • Full Guide Export • Keep building — you are on track!</div>
      </body></html>`;
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(()=>{ win.print(); }, 500);
    } catch(e){
      console.error("Print failed", e);
      window.print();
    }
  }


  return (
    <GradientBackground
      className="min-h-screen bg-transparent text-slate-900 animate-fade-in"
      overlay={false}
      enableCenterContent={false}
    >
      <section className="border-b border-black/8 bg-white/55 text-slate-800 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-5 py-5 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Career GPS dashboard</p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl text-slate-900">Your roadmap, {profile.name}</h1>
            <p className="mt-2 max-w-3xl text-slate-600">
              Showing a tailored, AI-generated career roadmap for {getStageLabel(profile.stage)} in {getFieldLabel(profile.field)}.
            </p>
            <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-700">
              Goal direction: {formatGoalType(profile.goal.type)} - {profile.goal.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
            <button
              className="focus-ring rounded-md bg-gradient-to-r from-[#28b7a5] to-emerald-600 px-4 py-2 text-sm font-semibold text-[#0b463b] hover:from-[#39cbba] hover:to-emerald-500 transition transform hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-emerald-200 print:hidden font-bold"
              type="button"
              onClick={onViewTimeline}
            >
              Journey Timeline
            </button>

            <button
              className="focus-ring rounded-md bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white hover:from-violet-400 hover:to-purple-500 transition transform hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-purple-200 print:hidden font-bold"
              type="button"
              id="open-career-mindmap"
              onClick={onViewMindmap}
            >
              Career Mindmap
            </button>
            <button
              className="focus-ring rounded-md bg-[#286f8f]/10 border border-[#286f8f]/20 px-4 py-2 text-sm font-semibold text-[#286f8f] hover:bg-[#286f8f]/20 transition transform hover:scale-[1.02] active:scale-[0.98] print:hidden"
              type="button"
              onClick={handlePrint}
            >
              Download PDF
            </button>
            <button
              className="focus-ring rounded-md border border-black/10 bg-black/5 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-black/10 hover:text-slate-950 transition transform hover:scale-[1.02] active:scale-[0.98] print:hidden"
              type="button"
              onClick={handleReset}
            >
              Edit Profile / Restart
            </button>
          </div>
        </div>
      </section>

      {/* Comprehensive Print View - entire career guide record */}
      <div className="hidden print:block print:p-6 print:bg-white text-slate-900">
        <div className="border-b-2 border-slate-900 pb-4 mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900">Career GPS — Career Guide</h1>
          <p className="mt-1 text-sm text-slate-600">Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()} • 127.0.0.1:5173</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <p><span className="font-bold">Name:</span> {profile.name}</p>
            <p><span className="font-bold">Stage:</span> {getStageLabel(profile.stage)}</p>
            <p><span className="font-bold">Field:</span> {getFieldLabel(profile.field)}</p>
            <p><span className="font-bold">Financial Tier:</span> {tierLabels[financialTier] || financialTier}</p>
            <p className="col-span-2"><span className="font-bold">Goal Direction:</span> {formatGoalType(profile.goal.type)} — {profile.goal.description}</p>
            <p><span className="font-bold">Skills:</span> {(profile.skills || []).join(", ") || "None"}</p>
            <p><span className="font-bold">Progress:</span> {(() => { const s = getProgressStats ? null : null; return `${completedGoals.size} goals completed`; })()}</p>
          </div>
        </div>

        {/* Goals to Achieve - always expanded */}
        <div className="mb-6 break-inside-avoid">
          <h2 className="text-xl font-extrabold text-slate-900 border-l-4 border-emerald-500 pl-3">Goals to Achieve</h2>
          <p className="mt-2 text-sm text-slate-600">{roadmap.goalsToAchieve?.description}</p>
          <div className="mt-4 space-y-3">
            {(roadmap.goalsToAchieve?.milestones || []).map((ms) => (
              <div key={ms.id} className="border border-slate-200 rounded-lg p-3 break-inside-avoid">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-sm text-slate-800">{ms.title}</h3>
                  <span className="text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full shrink-0">{ms.timeframe}</span>
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">{ms.detail}</p>
                {ms.prerequisites && ms.prerequisites.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {ms.prerequisites.map((pre) => (
                      <li key={pre.id} className="text-xs text-slate-700 flex gap-1.5"><span>•</span><span><span className="font-semibold">{pre.title}:</span> {pre.detail}</span></li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Mindmap expanded goals (if loaded) */}
        {(() => {
          const nodesForPrint = flattenScaffold(buildMindmapScaffold(profile, nodeStates, userSelections)).filter(n => {
            const st = (nodeStates || {})[n.id] || n.state;
            if (st === "locked") return false;
            if (n.isSelectionPoint || n.type === "selection") return false;
            const c = (nodeCache || {})[n.id];
            return c && ((c.goals && c.goals.length>0) || (c.achievements && c.achievements.length>0));
          });
          if (nodesForPrint.length === 0) return null;
          return (
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 border-l-4 border-violet-500 pl-3">Mindmap — Stage Goals (Expanded)</h2>
              <div className="mt-4 space-y-3">
                {nodesForPrint.map(node => {
                  const c = (nodeCache || {})[node.id];
                  return (
                    <div key={node.id} className="border border-slate-200 rounded-lg p-3 break-inside-avoid">
                      <h3 className="font-bold text-sm text-slate-800">{node.label} <span className="text-xs font-normal text-slate-500">({node.timeframe})</span></h3>
                      {c.summary && <p className="mt-1 text-xs text-slate-600 italic">{c.summary}</p>}
                      {c.goals && c.goals.length>0 && (
                        <ul className="mt-2 space-y-1">
                          {c.goals.map((g,i) => (
                            <li key={i} className="text-xs flex gap-1.5"><span className="text-emerald-600">✓</span><span className={completedGoals.has(g) ? "line-through text-slate-400":"text-slate-700"}>{g}</span></li>
                          ))}
                        </ul>
                      )}
                      {c.achievements && c.achievements.length>0 && (
                        <ul className="mt-2 space-y-1">
                          {c.achievements.map((a,i) => <li key={i} className="text-xs text-amber-800 flex gap-1.5"><span>⭐</span><span>{a}</span></li>)}
                        </ul>
                      )}
                      {c.skills && c.skills.length>0 && <p className="mt-2 text-xs"><span className="font-bold">Skills:</span> {c.skills.join(", ")}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Courses */}
        <div className="mb-6 break-inside-avoid">
          <h2 className="text-xl font-extrabold text-slate-900 border-l-4 border-ocean pl-3">College Courses</h2>
          {filtered.courses && filtered.courses.length>0 ? (
            <div className="mt-3 grid gap-2">
              {filtered.courses.map(c => (
                <div key={c.id} className="border border-slate-200 rounded-lg p-3">
                  <h3 className="font-bold text-sm">{c.name}</h3>
                  <p className="text-xs text-slate-600">Semester: {c.semester}</p>
                  <p className="text-xs text-slate-600 mt-1">{c.reason}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-slate-500 mt-2 italic">No courses for current financial tier / stage.</p>}
        </div>

        {/* Internships */}
        <div className="mb-6 break-inside-avoid">
          <h2 className="text-xl font-extrabold text-slate-900 border-l-4 border-coral pl-3">Internships</h2>
          {filtered.internships && filtered.internships.length>0 ? (
            <div className="mt-3 grid gap-2">
              {filtered.internships.map(it => (
                <div key={it.id} className="border border-slate-200 rounded-lg p-3">
                  <h3 className="font-bold text-sm">{it.role}</h3>
                  <p className="text-xs text-slate-600">When: {it.when} • Platforms: {(it.platforms||[]).join(", ")} • {it.stipendNote}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-slate-500 mt-2 italic">No internships for current tier / stage.</p>}
        </div>

        {/* Certifications */}
        <div className="mb-6 break-inside-avoid">
          <h2 className="text-xl font-extrabold text-slate-900 border-l-4 border-amber-500 pl-3">Certifications</h2>
          {filtered.certifications && filtered.certifications.length>0 ? (
            <div className="mt-3 grid gap-2">
              {filtered.certifications.map(cert => (
                <div key={cert.id} className="border border-slate-200 rounded-lg p-3">
                  <h3 className="font-bold text-sm">{cert.name}</h3>
                  <p className="text-xs text-slate-600">Platform: {cert.platform} • Cost: {cert.cost} • Duration: {cert.duration}</p>
                  <p className="text-xs text-slate-600 mt-1">{cert.impact}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-slate-500 mt-2 italic">No certifications for current tier.</p>}
        </div>

        {/* Alternate Paths */}
        <div className="mb-6 break-inside-avoid">
          <h2 className="text-xl font-extrabold text-slate-900 border-l-4 border-slate-700 pl-3">Alternate Paths</h2>
          {(roadmap.alternatePaths||[]).length>0 ? (
            <div className="mt-3 grid gap-2">
              {(roadmap.alternatePaths||[]).map(alt => (
                <div key={alt.id} className="border border-slate-200 rounded-lg p-3">
                  <h3 className="font-bold text-sm">{alt.title} <span className="text-xs font-normal text-slate-500">({alt.salaryRange})</span></h3>
                  <p className="text-xs text-slate-600">Skill Overlap: {alt.skillOverlap}% • Pivot Required: {alt.pivotRequired}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-xs text-slate-500 mt-2 italic">No alternate paths.</p>}
        </div>

        {/* Skill Gap */}
        <div className="mb-6 break-inside-avoid">
          <h2 className="text-xl font-extrabold text-slate-900 border-l-4 border-emerald-600 pl-3">Skill Gap</h2>
          <div className="mt-3 text-xs space-y-2">
            <p><span className="font-bold">Have:</span> {(roadmap.skillGap?.have||[]).join(", ") || "None"}</p>
            <p><span className="font-bold">Need:</span> {(roadmap.skillGap?.need||[]).map(n=>n.skill||n).join(", ") || "None"}</p>
            {(roadmap.skillGap?.bridgingSteps||[]).length>0 && (
              <ul className="list-disc ml-5 space-y-1">
                {(roadmap.skillGap.bridgingSteps||[]).map((s,i)=><li key={i}>{s}</li>)}
              </ul>
            )}
          </div>
        </div>

        {/* Deep Insights if available */}
        {deepRoadmap && (
          <div className="mb-6">
            <h2 className="text-xl font-extrabold text-slate-900 border-l-4 border-emerald-500 pl-3">Deep Insights — 6-Week Plan & Projects</h2>
            {deepRoadmap.weeklyStudyPlan && (
              <div className="mt-3 space-y-2">
                {deepRoadmap.weeklyStudyPlan.map((w,i)=>(
                  <div key={i} className="border border-slate-200 rounded-lg p-3 break-inside-avoid">
                    <h3 className="font-bold text-sm">{w.week}: {w.topic}</h3>
                    <p className="text-xs text-slate-600">Resource: {w.resource}</p>
                    <p className="text-xs text-slate-700 mt-1">Task: {w.actionItem}</p>
                  </div>
                ))}
              </div>
            )}
            {deepRoadmap.targetProjects && (
              <div className="mt-3 grid gap-2">
                {deepRoadmap.targetProjects.map((p,i)=>(
                  <div key={i} className="border border-slate-200 rounded-lg p-3 break-inside-avoid">
                    <h3 className="font-bold text-sm">{p.title} <span className="text-xs font-normal text-slate-500">({p.techStack})</span></h3>
                    <p className="text-xs text-slate-600 mt-1">{p.description}</p>
                    <ol className="list-decimal ml-5 text-xs mt-1 space-y-1">{(p.phases||[]).map((ph,idx)=><li key={idx}>{ph}</li>)}</ol>
                  </div>
                ))}
              </div>
            )}
            {deepRoadmap.strategicAdvice && <p className="mt-3 text-xs italic text-slate-700 border-l-2 border-emerald-300 pl-3">{deepRoadmap.strategicAdvice}</p>}
          </div>
        )}

        <div className="border-t border-slate-300 pt-3 mt-6 text-center text-xs text-slate-500">
          Career GPS • Full Guide Export • Page 1 of 1 • Keep building — you are on track!
        </div>
      </div>

      <section className="mx-auto grid max-w-[1600px] gap-5 px-5 py-5 md:px-8 lg:grid-cols-[240px_minmax(0,1fr)_280px] print:hidden">
        <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start">
          <Panel>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Financial view</p>
            <div className="mt-4 grid gap-2">
              {Object.entries(tierLabels).map(([tier, label]) => (
                <button
                  key={tier}
                  className={`focus-ring rounded-md px-3 py-2 text-left text-sm font-semibold transition-all duration-200 ${
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
          </Panel>

          <Panel>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Sections</p>
            <nav className="mt-4 grid gap-2">
              {filteredSections.map(([id, label]) => {
                const isDeep = id === "deep";
                const isUnlocked = !!deepRoadmap;
                return (
                  <button
                    key={id}
                    className={`focus-ring rounded-md px-3 py-2 text-left text-sm font-semibold transition-all duration-200 flex items-center justify-between ${
                      isDeep && !isUnlocked ? "lock-glow-pulse border border-emerald-500/20" : ""
                    } ${
                      activeSection === id
                        ? isDeep
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-200"
                          : "bg-emerald-500/10 text-emerald-800 border border-emerald-500/20"
                        : "text-slate-600 hover:bg-black/5 hover:text-slate-900"
                    }`}
                    type="button"
                    onClick={() => setActiveSection(id)}
                  >
                    <span>{label}</span>
                    {isDeep && (
                      isUnlocked ? (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                          Active
                        </span>
                      ) : (
                        <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Locked
                        </span>
                      )
                    )}
                  </button>
                );
              })}
            </nav>
          </Panel>
        </aside>

        <section className="min-w-0">
          <div className="mb-5 grid gap-4 md:grid-cols-3">
            <MetricCard label="Milestones" value={milestoneCount} color="bg-[#f7d06b]" />
            <MetricCard label="Certs for tier" value={filtered.certifications.length} color="bg-[#8fd5c0]" />
            <MetricCard label="Alternate paths" value={roadmap.alternatePaths.length} color="bg-[#f4a38f]" />
          </div>

          <ActiveSection
            activeSection={activeSection}
            profile={profile}
            roadmap={roadmap}
            filtered={filtered}
            financialTier={financialTier}
            selectedAlternate={selectedAlternate}
            onSelectAlternate={setSelectedAlternate}
            completedMilestones={completedMilestones}
            onToggleMilestone={toggleMilestone}
            deepRoadmap={deepRoadmap}
            onTriggerDeepWizard={() => setShowWizard(true)}
            completedDeepWeeks={completedDeepWeeks}
            onToggleDeepWeek={toggleDeepWeek}
            setDeepRoadmap={setDeepRoadmap}
            saveDeepRoadmap={saveDeepRoadmap}
            setCompletedDeepWeeks={setCompletedDeepWeeks}
            phaseCompleted={phaseCompleted}
            currentPhase={currentPhase}
            resumeAnalysis={resumeAnalysis}
            setResumeAnalysis={setResumeAnalysis}
            completedGoals={completedGoals}
            onToggleGoal={handleToggleGoal}
            nodeCache={nodeCache}
            nodeStates={nodeStates}
            userSelections={userSelections}
            onSelectOption={handleSelectOption}
            wizardOpenNodeId={wizardOpenNodeId}
            setWizardOpenNodeId={setWizardOpenNodeId}
            wizardStep={wizardStep}
            setWizardStep={setWizardStep}
            manuallyClosedId={manuallyClosedId}
            setManuallyClosedId={setManuallyClosedId}
          />
        </section>

        <ProgressShell roadmap={roadmap} financialTier={financialTier} progressStats={progressStats} deepRoadmap={deepRoadmap} />
      </section>

      {showWizard && (
        <DeepOptimizationWizard
          profile={profile}
          roadmap={roadmap}
          onComplete={(data) => {
            setDeepRoadmap(data);
            saveDeepRoadmap(data);
            setShowWizard(false);
            setActiveSection("deep");
          }}
          onClose={() => setShowWizard(false)}
        />
      )}

      {/* ── ONBOARDING WIZARD MODAL OVERLAY ── */}
      {wizardOpenNodeId && wizardNode && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[2000] flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-scale-up"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧭</span>
                <div>
                  <span className="text-[10px] font-extrabold text-cyan-600 uppercase tracking-wider">Onboarding Choice Step</span>
                  <h2 className="font-extrabold text-base text-slate-900 mt-0.5">{wizardNode.label}</h2>
                </div>
              </div>
              <button
                onClick={() => {
                  setManuallyClosedId(wizardNode.id);
                  setWizardOpenNodeId(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto max-h-[60vh] space-y-6">
              {/* Step Indicators */}
              {wizardNode.id === "node-board-select" && (
                <div className="flex items-center gap-2">
                  <span className={`h-2 flex-1 rounded-full ${wizardStep >= 1 ? "bg-cyan-600" : "bg-slate-200"}`} />
                  <span className={`h-2 flex-1 rounded-full ${wizardStep >= 2 ? "bg-cyan-600" : "bg-slate-200"}`} />
                </div>
              )}
              {wizardNode.id === "node-ug-select" && (
                <div className="flex items-center gap-2">
                  <span className={`h-2 flex-1 rounded-full ${wizardStep >= 1 ? "bg-cyan-600" : "bg-slate-200"}`} />
                  <span className={`h-2 flex-1 rounded-full ${wizardStep >= 2 ? "bg-cyan-600" : "bg-slate-200"}`} />
                </div>
              )}

              {/* WIZARD FLOW: BOARD SELECTION */}
              {wizardNode.id === "node-board-select" && (
                <div className="space-y-4">
                  {wizardStep === 1 && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="mb-2">
                        <h4 className="text-sm font-extrabold text-slate-800">Step 1: Select Your Board</h4>
                        <p className="text-xs text-slate-500 mt-1">Choose the educational board you want to pursue for your high school studies.</p>
                      </div>
                      
                      <div className="grid gap-3">
                        {boardOptions.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setSelBoard(opt.value);
                              setSelStream("");
                              if (opt.value === "Polytechnic Diploma") {
                                setSelStream(""); // Diploma has no high-school streams
                              }
                            }}
                            className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-1 w-full ${
                              selBoard === opt.value
                                ? "border-cyan-600 bg-cyan-50/20 shadow-md shadow-cyan-650/5"
                                : "border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-50/30"
                            }`}
                          >
                            <span className={`text-sm font-extrabold ${selBoard === opt.value ? "text-cyan-900" : "text-slate-805"}`}>
                              {opt.title}
                            </span>
                            <span className="text-xs text-slate-500 font-normal leading-normal">
                              {opt.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {wizardStep === 2 && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="mb-2">
                        <h4 className="text-sm font-extrabold text-slate-800">Step 2: Select Your Stream (Branch)</h4>
                        <p className="text-xs text-slate-500 mt-1">Select your specialized branch for {selBoard}. This will unlock stream-specific subjects.</p>
                      </div>

                      <div className="grid gap-3">
                        {boardStreamOptions.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setSelStream(opt.value)}
                            className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-1 w-full ${
                              selStream === opt.value
                                ? "border-cyan-600 bg-cyan-50/20 shadow-md shadow-cyan-650/5"
                                : "border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-50/30"
                            }`}
                          >
                            <span className={`text-sm font-extrabold ${selStream === opt.value ? "text-cyan-900" : "text-slate-808"}`}>
                              {opt.title}
                            </span>
                            <span className="text-xs text-slate-500 font-normal leading-normal">
                              {opt.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* WIZARD FLOW: UG SELECTION */}
              {wizardNode.id === "node-ug-select" && (
                <div className="space-y-4">
                  {wizardStep === 1 && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="mb-2">
                        <h4 className="text-sm font-extrabold text-slate-800">Step 1: Select College Tier Joined</h4>
                        <p className="text-xs text-slate-500 mt-1">Select the classification tier of the college you joined for undergraduate studies.</p>
                      </div>
                      
                      <div className="grid gap-3">
                        {[
                          { value: "Tier 1", title: "Tier 1 College", desc: "Top Tier national institutions (IITs, NITs, BITS, Top Universities). Highly selective." },
                          { value: "Tier 2", title: "Tier 2 College", desc: "Established state government universities and reputable private engineering/degree colleges." },
                          { value: "Tier 3", title: "Tier 3 College", desc: "Local affiliated colleges and regional teaching colleges." }
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setSelTier(opt.value)}
                            className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-1 w-full ${
                              selTier === opt.value
                                ? "border-cyan-600 bg-cyan-50/20 shadow-md shadow-cyan-650/5"
                                : "border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-50/30"
                            }`}
                          >
                            <span className={`text-sm font-extrabold ${selTier === opt.value ? "text-cyan-900" : "text-slate-805"}`}>
                              {opt.title}
                            </span>
                            <span className="text-xs text-slate-500 font-normal leading-normal">
                              {opt.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {wizardStep === 2 && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="mb-2">
                        <h4 className="text-sm font-extrabold text-slate-800">Step 2: Select UG Degree Course</h4>
                        <p className="text-xs text-slate-500 mt-1">Select the course you are enrolled in. The recommended option is highlighted based on your profile.</p>
                      </div>

                      <div className="flex flex-col gap-3">
                        {ugCourseOptions.map(opt => {
                          const isRecommended = opt.value.toLowerCase().includes(recUg.split(" ")[0].toLowerCase().replace("b.tech", "b.tech").replace("b.sc", "b.sc").replace("b.com", "b.com").slice(0,6));
                          return (
                            <button
                              key={opt.value}
                              onClick={() => setSelUgCourse(opt.value)}
                              className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-1 w-full relative ${
                                selUgCourse === opt.value
                                  ? "border-cyan-600 bg-cyan-50/20 shadow-md"
                                  : "border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-50/30"
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className={`text-sm font-extrabold ${selUgCourse === opt.value ? "text-cyan-950" : "text-slate-805"}`}>
                                  {opt.title}
                                </span>
                                {isRecommended && (
                                  <span className={`text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 ${
                                    selUgCourse === opt.value 
                                      ? "bg-cyan-700 border-cyan-500 text-cyan-100" 
                                      : "bg-amber-100 border-amber-250 text-amber-800"
                                  }`}>
                                    Recommended ⭐
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500 font-normal leading-normal">
                                {opt.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* WIZARD FLOW: POSTGRAD WORKFORCE vs MASTERS */}
              {wizardNode.id === "node-postgrad-select" && (
                <div className="space-y-4 animate-fade-in">
                  {wizardStep === 1 && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="mb-2">
                        <h4 className="text-sm font-extrabold text-slate-800">Step 1: Select Post-Graduation Pathway</h4>
                        <p className="text-xs text-slate-500 mt-1">Select whether you want to enter the workforce directly or specialize with a Master's degree.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { value: "→ Enter Workforce", title: "Junior Role", desc: "Pivot directly into target industry associate roles, placements, and client projects.", action: "Secure Junior Placement" },
                          { value: "→ Masters Degree", title: "Master's Degree", desc: "Pursue post-graduate studies (M.Tech/MBA/M.Sc) to gain specialized depth.", action: "Higher Specialization" }
                        ].map(opt => {
                          const isRecommended = opt.value === recPg;
                          const isSelected = selPgChoice === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setSelPgChoice(opt.value);
                                if (opt.value === "→ Masters Degree") {
                                  handleSelectOption(wizardNode.id, "→ Masters Degree");
                                  setWizardOpenNodeId(null);
                                } else {
                                  setWizardStep(2);
                                }
                              }}
                              className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-[180px] group transition-all w-full ${
                                isSelected
                                  ? "border-cyan-600 bg-cyan-50/20 shadow-md shadow-cyan-650/5"
                                  : "border-slate-200 bg-white hover:border-cyan-400 hover:bg-cyan-50/10"
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex justify-between items-center w-full">
                                  <span className={`text-sm font-extrabold ${isSelected ? "text-cyan-900" : "text-slate-800 group-hover:text-cyan-600"}`}>{opt.title}</span>
                                  {isRecommended && (
                                    <span className="text-[9px] font-extrabold uppercase tracking-wide bg-amber-100 border border-amber-250 text-amber-800 px-2 py-0.5 rounded-full">
                                      Recommended ⭐
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 leading-normal font-normal">
                                  {opt.desc}
                                </p>
                              </div>
                              <span className="text-[10px] font-extrabold text-cyan-600 group-hover:text-cyan-700 tracking-wider uppercase mt-4">
                                {opt.action} →
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {wizardStep === 2 && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="mb-2">
                        <h4 className="text-sm font-extrabold text-slate-800">Step 2: Choose Target Progression Goals</h4>
                        <p className="text-xs text-slate-500 mt-1">Select the goal trajectory you want to focus on to help you become a senior, team lead, or manager.</p>
                      </div>

                      <div className="grid gap-3">
                        {[
                          { value: "SENIOR", title: "💻 Senior Specialist / Individual Contributor", desc: "Focus on technical mastery, design patterns, mentorship, and system scaling." },
                          { value: "MANAGER", title: "👥 Team Manager / Project Lead", desc: "Focus on project execution, agile coordination, budgeting, and team growth." },
                          { value: "EXECUTIVE", title: "📈 Director / Engineering Executive", desc: "Focus on organization strategy, cross-team synergy, and business-tech alignment." }
                        ].map(opt => {
                          const isSelected = selProgression === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setSelProgression(opt.value)}
                              className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-1 w-full ${
                                isSelected
                                  ? "border-cyan-600 bg-cyan-50/20 shadow-md shadow-cyan-650/5"
                                  : "border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-50/30"
                              }`}
                            >
                              <span className={`text-sm font-extrabold ${isSelected ? "text-cyan-900" : "text-slate-808"}`}>
                                {opt.title}
                              </span>
                              <span className="text-xs text-slate-500 font-normal leading-normal">
                                {opt.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* WIZARD FLOW: MASTERS SPECIALIZATION */}
              {wizardNode.id === "node-masters-select" && (
                <div className="space-y-4 animate-fade-in">
                  {wizardStep === 1 && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="mb-2">
                        <h4 className="text-sm font-extrabold text-slate-800">Step 1: Select College Tier Admitted</h4>
                        <p className="text-xs text-slate-500 mt-1">Select the classification tier of the university or college you secured admission into.</p>
                      </div>

                      <div className="grid gap-3">
                        {[
                          { value: "Tier 1", title: "Tier 1 Institution (Premier)", desc: "IITs, IISc, premier IIMs, selective foreign universities (Ivy League), or leading Central Universities." },
                          { value: "Tier 2", title: "Tier 2 Institution (Reputed)", desc: "Reputed state universities, selective private/regional business schools and tech colleges." },
                          { value: "Tier 3", title: "Tier 3 / Local College", desc: "Local colleges, regional institutions, and distance learning PG universities." }
                        ].map(opt => {
                          const isSelected = selMastersTier === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setSelMastersTier(opt.value);
                                setWizardStep(2);
                              }}
                              className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-1 w-full ${
                                isSelected
                                  ? "border-cyan-600 bg-cyan-50/20 shadow-md shadow-cyan-650/5"
                                  : "border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-50/30"
                              }`}
                            >
                              <span className={`text-sm font-extrabold ${isSelected ? "text-cyan-900" : "text-slate-808"}`}>
                                {opt.title}
                              </span>
                              <span className="text-xs text-slate-500 font-normal leading-normal">
                                {opt.desc}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {wizardStep === 2 && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="mb-2">
                        <h4 className="text-sm font-extrabold text-slate-800">Step 2: Choose PG Course & Specialization</h4>
                        <p className="text-xs text-slate-500 mt-1">Choose the post-graduate major specialization course. The recommended choice is highlighted.</p>
                      </div>

                      <div className="flex flex-col gap-3">
                        {pgCourseOptions.map(opt => {
                          const isTechField = profile.field?.type === "TECH" || profile.field?.type === "SCIENCE";
                          const isRecommended = isTechField ? opt.isTech : (!opt.isTech && opt.value.startsWith("MBA"));
                          const isSelected = selMastersCourse === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setSelMastersCourse(opt.value)}
                              className={`p-4 rounded-2xl border text-left transition-all flex justify-between items-center w-full ${
                                isSelected
                                  ? "border-cyan-600 bg-cyan-50/20 shadow-md"
                                  : "border-slate-200 bg-white hover:border-slate-350 hover:bg-slate-50/30"
                              }`}
                            >
                              <div>
                                <span className={`text-sm font-extrabold ${isSelected ? "text-cyan-955" : "text-slate-808"}`}>
                                  {opt.title}
                                </span>
                                <p className="text-xs text-slate-500 mt-1 font-normal leading-normal">{opt.desc}</p>
                              </div>
                              {isRecommended && (
                                <span className={`text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 ${
                                  isSelected 
                                    ? "bg-cyan-700 border-cyan-500 text-cyan-100" 
                                    : "bg-amber-100 border-amber-250 text-amber-800"
                                }`}>
                                  Recommended ⭐
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {((wizardNode.id === "node-board-select" && wizardStep === 2) || 
              (wizardNode.id === "node-board-select" && selBoard === "Polytechnic Diploma") ||
              (wizardNode.id === "node-ug-select" && wizardStep === 2) ||
              (wizardNode.id === "node-postgrad-select" && wizardStep === 2) ||
              (wizardNode.id === "node-masters-select" && wizardStep === 2)) && (
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center gap-3">
                <button
                  onClick={() => setWizardStep(1)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl transition"
                >
                  ← Back
                </button>
                <button
                  disabled={
                    (wizardNode.id === "node-board-select" && selBoard !== "Polytechnic Diploma" && !selStream) ||
                    (wizardNode.id === "node-ug-select" && !selUgCourse) ||
                    (wizardNode.id === "node-postgrad-select" && !selProgression) ||
                    (wizardNode.id === "node-masters-select" && !selMastersCourse)
                  }
                  onClick={() => {
                    if (wizardNode.id === "node-board-select") {
                      const val = getBoardSelectionValue(selBoard, selStream, profile);
                      handleSelectOption(wizardNode.id, val);
                    } else if (wizardNode.id === "node-ug-select") {
                      handleSelectOption(wizardNode.id, `${selTier} - ${selUgCourse}`);
                    } else if (wizardNode.id === "node-postgrad-select") {
                      handleSelectOption(wizardNode.id, "→ Enter Workforce");
                      saveSelProgression(profile.name, selProgression);
                    } else if (wizardNode.id === "node-masters-select") {
                      handleSelectOption(wizardNode.id, selMastersCourse);
                      saveSelMastersTier(profile.name, selMastersTier);
                    }
                    setWizardOpenNodeId(null);
                  }}
                  className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition"
                >
                  Confirm & Unlock Pathway
                </button>
              </div>
            )}

            {/* Next button for Step 1 in multi-step wizard */}
            {((wizardNode.id === "node-board-select" && wizardStep === 1 && selBoard && selBoard !== "Polytechnic Diploma") || 
              (wizardNode.id === "node-ug-select" && wizardStep === 1 && selTier) ||
              (wizardNode.id === "node-postgrad-select" && wizardStep === 1 && selPgChoice === "→ Enter Workforce") ||
              (wizardNode.id === "node-masters-select" && wizardStep === 1 && selMastersTier)) && (
              <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  onClick={() => setWizardStep(2)}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition"
                >
                  Continue Step 2 →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </GradientBackground>
  );
}

function getOverlapReason(itemName, itemImpactReason, gaps) {
  if (!gaps || gaps.length === 0) return null;
  const nameLower = itemName.toLowerCase();
  const descLower = (itemImpactReason || "").toLowerCase();
  
  for (const gap of gaps) {
    const gapLower = gap.toLowerCase().trim();
    if (gapLower && (nameLower.includes(gapLower) || descLower.includes(gapLower))) {
      return `Bridges resume gap: ${gap}`;
    }
  }
  return null;
}

function AICoachPanel({ profile, resumeAnalysis }) {
  if (!resumeAnalysis) return null;
  
  const gaps = resumeAnalysis.gaps || [];
  const recommendations = resumeAnalysis.recommendations || [];
  const stage = profile.stage;
  const goal = profile.goal?.description || "your career goal";

  let stageAdvice = "";
  if (stage === "CLASS_7_8" || stage === "CLASS_9_10") {
    stageAdvice = "Since you are in middle/high school, keep your focus on interactive, visual coding or foundational concepts. Avoid paying for high-cost enterprise cloud certs for now. Opt for free bootcamps or beginner projects.";
  } else if (stage === "CLASS_11_12") {
    stageAdvice = "As a high school student preparing for college/university, focus on learning core programming fundamentals (Python, HTML/JS) and building small, visual tools that can act as portfolio anchors.";
  } else if (stage === "UNDERGRADUATE" || stage === "POSTGRADUATE") {
    stageAdvice = "As a college student aiming for placement/internships, you should prioritize industry-recognized certs (AWS, Google, Coursera) and build complex, end-to-end applications to bridge your gaps.";
  } else {
    stageAdvice = "As a working professional looking to transition, focus on production-grade projects demonstrating real-world applications of your target skills, and align your certifications directly with recruiter profiles.";
  }

  return (
    <div className="rounded-xl border border-[#28b7a5]/30 bg-gradient-to-r from-emerald-50/40 to-teal-50/40 p-5 shadow-sm border-l-4 border-l-[#28b7a5] mb-6 animate-fade-in print:hidden">
      <div className="flex gap-4 flex-col sm:flex-row items-start">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#28b7a5]/10 border border-[#28b7a5]/20 text-[#0b463b] shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-5 h-5 text-teal-700">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v1m0-12a5 5 0 00-5 5c0 1.637.78 3.09 2 4v2a2 2 0 004 0v-2c1.22-1.91 2-3.363 2-4a5 5 0 00-5-5z" />
          </svg>
        </div>
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-extrabold text-[#0b463b]">AI Resume Coach: Bridging Insights</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Based on your parsed resume, your stage as a <strong>{stage.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</strong>, and your goal as a <strong>{goal}</strong>.
            </p>
          </div>
          
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {stageAdvice}
          </p>

          {gaps.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800">Gaps to Bridge</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {gaps.map((gap, i) => (
                  <span key={i} className="rounded bg-rose-50 border border-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 shadow-sm">
                    {gap}
                  </span>
                ))}
              </div>
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="space-y-1 border-t border-slate-200/50 pt-2.5 mt-2.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#28b7a5]">Top Bridging Actions</span>
              <ul className="mt-1.5 space-y-1.5">
                {recommendations.slice(0, 3).map((rec, i) => (
                  <li key={i} className="flex gap-2 items-start text-xs text-slate-600">
                    <span className="text-[#28b7a5] font-extrabold">→</span>
                    <span className="font-semibold">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActiveSection({
  activeSection,
  profile,
  roadmap,
  filtered,
  financialTier,
  selectedAlternate,
  onSelectAlternate,
  completedMilestones,
  onToggleMilestone,
  deepRoadmap,
  onTriggerDeepWizard,
  completedDeepWeeks,
  onToggleDeepWeek,
  setDeepRoadmap,
  saveDeepRoadmap,
  setCompletedDeepWeeks,
  phaseCompleted,
  resumeAnalysis,
  setResumeAnalysis,
  completedGoals,
  onToggleGoal,
  nodeCache,
  nodeStates,
  userSelections,
  onSelectOption,
  wizardOpenNodeId,
  setWizardOpenNodeId,
  wizardStep,
  setWizardStep,
  manuallyClosedId,
  setManuallyClosedId,
}) {
  const [deepTab, setDeepTab] = useState("study");


  if (activeSection === "courses") {
    return (
      <div className="space-y-4 animate-fade-in">
        <AICoachPanel profile={profile} resumeAnalysis={resumeAnalysis} />
        <TieredList
          title="College Courses"
          items={filtered.courses}
          renderItem={(item) => {
            const overlap = getOverlapReason(item.name, item.reason, resumeAnalysis?.gaps);
            return <CourseCard item={item} overlapReason={overlap} />;
          }}
        />
      </div>
    );
  }
  if (activeSection === "internships") return <TieredList title="Internships" items={filtered.internships} renderItem={(item) => <InternshipCard item={item} />} />;
  if (activeSection === "certifications") {
    return (
      <div className="space-y-4 animate-fade-in">
        <AICoachPanel profile={profile} resumeAnalysis={resumeAnalysis} />
        <Panel className="border-l-4 border-l-ocean">
          <SectionHeader kicker="Filtered by financial tier" title="Certifications" description="These update instantly when the tier toggle changes. Check off certifications to track progress." />
          <div className="mt-5 grid gap-3">
            {filtered.certifications.map((item) => {
              const overlap = getOverlapReason(item.name, item.impact, resumeAnalysis?.gaps);
              return (
                <CertificationCard
                  key={item.id}
                  item={item}
                  checked={completedMilestones.has(item.id)}
                  onToggle={onToggleMilestone}
                  overlapReason={overlap}
                />
              );
            })}
          </div>
        </Panel>
      </div>
    );
  }
  if (activeSection === "alternates") {
    return (
      <AlternatePaths
        paths={roadmap.alternatePaths}
        selectedAlternate={selectedAlternate}
        onSelectAlternate={onSelectAlternate}
      />
    );
  }
  if (activeSection === "skills") {
    const need = [];
    const rootScaffold = buildMindmapScaffold(profile, nodeStates, userSelections);
    const flatScaffold = flattenScaffold(rootScaffold);
    
    flatScaffold.forEach(node => {
      const state = (nodeStates || {})[node.id] || node.state;
      if (state !== "locked") {
        const content = (nodeCache || {})[node.id];
        if (content && content.skills) {
          content.skills.forEach(skill => {
            need.push({ skill, milestoneId: node.id });
          });
        }
      }
    });

    const dynamicSkillGap = {
      have: profile.skills || [],
      need,
      bridgingSteps: roadmap.skillGap?.bridgingSteps || [
        "Follow the active mindmap milestone objectives.",
        "Practice target technical skills daily."
      ]
    };

    return <SkillMap skillGap={dynamicSkillGap} profile={profile} completedMilestones={completedMilestones} resumeAnalysis={resumeAnalysis} />;
  }
  if (activeSection === "resume") return <ResumeAnalyzer profile={profile} onAnalysisComplete={setResumeAnalysis} />;
  if (activeSection === "market") return <MarketIntelligence profile={profile} />;
  if (activeSection === "chat") return <CareerChat profile={profile} />;

  if (activeSection === "deep") {
    if (!deepRoadmap) {
      return (
        <div className="animate-slide-up space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c1524] to-[#12253f] p-8 text-white shadow-2xl border border-emerald-500/20">
            {/* Abstract background shapes */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-ocean/20 blur-3xl pointer-events-none" />
            
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400">
                ⚡ AI Advanced Optimization
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl">
                Deepen Your Career Roadmap
              </h2>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-slate-300">
                Ready to take this roadmap to the next level? Unlock a highly-specialized **Deep Study & Project Blueprint** custom-synthesized by Google Gemini specifically for your profile.
              </p>
              
              <div className="mt-8 grid gap-6 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm card-hover-dynamic">
                  <span className="text-2xl">📅</span>
                  <h3 className="mt-3 font-bold text-emerald-300 text-[15px]">6-Week Study Plan</h3>
                  <p className="mt-2 text-xs text-slate-400">A rigorous daily/weekly schedule with curated online study topics and top learning resources.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm card-hover-dynamic">
                  <span className="text-2xl">🛠️</span>
                  <h3 className="mt-3 font-bold text-emerald-300 text-[15px]">2 Custom Portfolio Projects</h3>
                  <p className="mt-2 text-xs text-slate-400">Step-by-step production project specs with recommended frameworks to prove your work.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm card-hover-dynamic">
                  <span className="text-2xl">💡</span>
                  <h3 className="mt-3 font-bold text-emerald-300 text-[15px]">Coaching & Strategy Corner</h3>
                  <p className="mt-2 text-xs text-slate-400">Exclusive advice on niche-positioning, resume hooks, and direct networking tactics.</p>
                </div>
              </div>
              
              <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center border-t border-white/15 pt-6">
                <button
                  type="button"
                  onClick={onTriggerDeepWizard}
                  className="w-full sm:w-auto px-8 py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-[15px] font-bold text-white shadow-lg animate-emerald-glow transition transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Launch Deep Optimization Wizard
                </button>
                <p className="text-xs text-slate-400 text-center sm:text-left">
                  Takes 2 minutes. Gemini dynamically designs custom questions based on your Stage, Field, and Career Goals.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="animate-slide-up space-y-6">
        <Panel className="border-l-4 border-l-emerald-500 animate-fade-in">
          <SectionHeader
            kicker="AI-Powered Optimization"
            title="Your Deep Career Insights"
            description="Your premium Phase 2 study plans, custom-tailored projects, and strategic networking blueprints are unlocked."
          />
          
          <div className="flex gap-6 border-b border-slate-200 pb-1 mt-6 mb-6 overflow-x-auto print:hidden">
            <button
              type="button"
              onClick={() => setDeepTab("study")}
              className={`pb-3 font-bold text-sm transition-all duration-200 shrink-0 tab-glow-under ${
                deepTab === "study"
                  ? "text-emerald-700 active font-extrabold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              📅 6-Week Study Schedule
            </button>
            <button
              type="button"
              onClick={() => setDeepTab("projects")}
              className={`pb-3 font-bold text-sm transition-all duration-200 shrink-0 tab-glow-under ${
                deepTab === "projects"
                  ? "text-emerald-700 active font-extrabold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              🛠️ Portfolio Blueprints
            </button>
            <button
              type="button"
              onClick={() => setDeepTab("coaching")}
              className={`pb-3 font-bold text-sm transition-all duration-200 shrink-0 tab-glow-under ${
                deepTab === "coaching"
                  ? "text-emerald-700 active font-extrabold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              💡 Strategic Coaching Corner
            </button>
          </div>

          {deepTab === "study" && (
            <div className="space-y-4 animate-fade-in">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-ink">Your Custom 6-Week Intensive Study Plan</h3>
                <p className="text-sm text-slate-600">Track your weekly learning progression. Mark each week as completed to check off your milestones.</p>
              </div>
              <div className="grid gap-4">
                {deepRoadmap.weeklyStudyPlan.map((weekItem, idx) => {
                  const isCompleted = completedDeepWeeks.includes(weekItem.week);
                  return (
                    <label
                      key={weekItem.week}
                      onClick={() => onToggleDeepWeek(weekItem.week)}
                      className={`flex cursor-pointer gap-4 rounded-xl p-5 ${
                        isCompleted
                          ? "border border-emerald-200 bg-emerald-50/40 shadow-inner"
                          : "card-emerald-glow"
                      }`}
                    >
                      <div
                        className={`mt-1 custom-checkbox shrink-0 ${isCompleted ? "checked" : ""}`}
                      >
                        <div className="custom-checkbox-checkmark" />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className={`text-xs font-extrabold uppercase tracking-widest ${
                            isCompleted ? "text-emerald-700" : "text-emerald-600"
                          }`}>
                            {weekItem.week}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 border border-slate-200">
                            📖 Resource: {weekItem.resource}
                          </span>
                        </div>
                        <h4 className={`mt-2 text-lg font-bold transition-all duration-200 ${
                          isCompleted ? "text-emerald-900 line-through opacity-70" : "text-ink"
                        }`}>
                          {weekItem.topic}
                        </h4>
                        <p className={`mt-2 text-sm leading-relaxed transition-all duration-200 ${
                          isCompleted ? "text-emerald-800/80 opacity-60" : "text-slate-600"
                        }`}>
                          <strong className="text-ink">Weekly Task:</strong> {weekItem.actionItem}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {deepTab === "projects" && (
            <div className="space-y-6 animate-fade-in">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-ink">Custom Portfolio Blueprints</h3>
                <p className="text-sm text-slate-600">High-impact, proof-of-work project templates. Add these to your public profile to catch recruiters' attention.</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                {deepRoadmap.targetProjects.map((project, index) => (
                  <div
                    key={index}
                    className="flex flex-col rounded-xl card-premium-glow p-6 shadow-sm"
                  >
                    <div className="flex-1">
                      <span className="inline-flex items-center gap-1 rounded-full bg-ocean/10 px-2.5 py-1 text-xs font-bold text-ocean">
                        🔨 Blueprint #{index + 1}
                      </span>
                      <h4 className="mt-3 text-xl font-extrabold text-ink">{project.title}</h4>
                      
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {project.techStack.split(",").map((tech, tIdx) => (
                          <span key={tIdx} className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
                            {tech.trim()}
                          </span>
                        ))}
                      </div>
                      
                      <p className="mt-4 text-sm leading-relaxed text-slate-600">{project.description}</p>
                      
                      <div className="mt-5 border-t border-slate-100 pt-5">
                        <h5 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Implementation Phases</h5>
                        <ol className="mt-3 space-y-3">
                          {project.phases.map((phase, pIdx) => (
                            <li key={pIdx} className="flex gap-2.5 items-start text-sm text-slate-600">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#dff3e8] text-xs font-extrabold text-emerald-800">
                                {pIdx + 1}
                              </span>
                              <span>{phase}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {deepTab === "coaching" && (
            <div className="space-y-6 animate-fade-in">
              <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 p-8 shadow-sm">
                <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-emerald-200/20 blur-2xl pointer-events-none" />
                
                <div className="relative z-10 flex gap-4 flex-col sm:flex-row items-start">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white text-xl shadow-md text-center">
                    💡
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-950">Gemini Career Coaching Insights</h3>
                    <p className="mt-3 text-[15px] font-medium leading-relaxed text-slate-800 italic">
                      "{deepRoadmap.strategicAdvice}"
                    </p>
                    <div className="mt-6 border-t border-emerald-200/50 pt-5">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">Recommended Daily Routine</h4>
                      <ul className="mt-3 space-y-2 text-sm text-slate-700">
                        <li className="flex gap-2 items-center">
                          <span className="text-emerald-600 font-bold">✓</span> <span>Dedicate your selected time slots in a distraction-free space.</span>
                        </li>
                        <li className="flex gap-2 items-center">
                          <span className="text-emerald-600 font-bold">✓</span> <span>Write code or build visual mockups every single day.</span>
                        </li>
                        <li className="flex gap-2 items-center">
                          <span className="text-emerald-600 font-bold">✓</span> <span>Write brief learning updates on LinkedIn to build public evidence.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Dynamic Reset Button for Deep Roadmap */}
              <div className="flex justify-end pt-4 border-t border-slate-100 print:hidden">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Are you sure you want to reset your Phase 2 assessment? This will delete your current deep study plan.")) {
                      setDeepRoadmap(null);
                      saveDeepRoadmap(null);
                      saveCompletedDeepWeeks([]);
                      setCompletedDeepWeeks([]);
                    }
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-rose-600 transition"
                >
                  Reset Deep Optimization Assessment
                </button>
              </div>
            </div>
          )}
        </Panel>
      </div>
    );
  }

  return (
    <Goals
      profile={profile}
      completedGoals={completedGoals}
      onToggleGoal={onToggleGoal}
      nodeCache={nodeCache}
      nodeStates={nodeStates}
      userSelections={userSelections}
      onSelectOption={onSelectOption}
      wizardOpenNodeId={wizardOpenNodeId}
      setWizardOpenNodeId={setWizardOpenNodeId}
      wizardStep={wizardStep}
      setWizardStep={setWizardStep}
      manuallyClosedId={manuallyClosedId}
      setManuallyClosedId={setManuallyClosedId}
    />
  );
}

function Goals({
  profile,
  completedGoals,
  onToggleGoal,
  nodeCache,
  nodeStates,
  userSelections,
  onSelectOption,
  wizardOpenNodeId,
  setWizardOpenNodeId,
  wizardStep,
  setWizardStep,
  manuallyClosedId,
  setManuallyClosedId
}) {
  const [tooltip, setTooltip] = useState(null);
  const [expandedSelId, setExpandedSelId] = useState(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState(() => new Set());

  const toggleNodeCollapsed = (nodeId) => {
    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const scaffold = buildMindmapScaffold(profile, nodeStates, userSelections);
  const flatNodes = flattenScaffold(scaffold);

  const activeSelNodes = flatNodes.filter(n => {
    if (!n.isSelectionPoint) return false;
    const state = (nodeStates || {})[n.id] || n.state;
    return state === "unlocked" || state === "in_progress";
  });

  const doneSelNodes = flatNodes.filter(n => {
    if (!n.isSelectionPoint) return false;
    const state = (nodeStates || {})[n.id] || n.state;
    return state === "completed" && (userSelections || {})[n.id];
  });

  const wizardNode = flatNodes.find(n => n.id === wizardOpenNodeId);

  // Recommended calculations based on profile
  const fieldType = profile.field?.type || "TECH";
  let recUg = "B.Tech / B.E. (Computer Science/IT)";
  if (fieldType === "SCIENCE") recUg = "B.Sc (Sciences/Biotech)";
  else if (fieldType === "COMMERCE") recUg = "B.Com / BBA (Business/Finance)";
  else if (fieldType === "LAW" || fieldType === "ARTS") recUg = "BA (Arts/Humanities/Law)";
  else if (fieldType === "MEDICINE") recUg = "MBBS / BDS (Medicine)";

  let recPg = "→ Enter Workforce";
  if (profile.goal?.type === "HIGHER_STUDIES") recPg = "→ Masters Degree";

  let recPgCourse = "M.Tech / MS (Computer Science/IT)";
  if (fieldType === "SCIENCE") recPgCourse = "M.Sc (Sciences)";
  else if (fieldType === "COMMERCE") recPgCourse = "MBA (Management/Finance)";
  else if (fieldType === "LAW" || fieldType === "ARTS") recPgCourse = "MA (Arts/Humanities/Law)";

  // Filter nodes that are unlocked/in progress/completed
  const activeNodes = flatNodes.filter(n => {
    const state = (nodeStates || {})[n.id] || n.state;
    if (state === "locked") return false;
    // Skip checkpoints and choice/selection points completely from the checklist list
    if (n.isCheckpoint || n.isSelectionPoint || n.type === "selection") return false;
    return true;
  });

  // Filter nodes for display in the Goals tab - include checkpoints but skip choice/selection points
  const nodesForGoalsList = flatNodes.filter(n => {
    const state = (nodeStates || {})[n.id] || n.state;
    if (state === "locked") return false;
    if (n.isSelectionPoint || n.type === "selection") return false;
    if (n.isCheckpoint || n.type === "checkpoint") return true;
    const content = (nodeCache || {})[n.id];
    return content && content.goals && content.goals.length > 0;
  });

  // Check if all preceding goals in unlocked stages are completed
  const allPrecedingGoalsCompleted = activeNodes.every(n => {
    if (n.id === "node-root") return true;
    const content = (nodeCache || {})[n.id];
    if (!content || !content.goals || content.goals.length === 0) {
      return false; // If content hasn't loaded yet, treat it as not completed
    }
    const goalsList = content.goals;
    return goalsList.every(g => completedGoals.has(g));
  });

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
    <div className="grid gap-6 animate-fade-in relative">
      {/* Onboarding / Next Step Required Banner (RENDERED AT THE TOP) */}
      {allPrecedingGoalsCompleted && activeSelNodes.length > 0 && (
        <Panel className="border-l-4 border-l-cyan-500 bg-gradient-to-r from-cyan-50/20 to-sky-50/10">
          <SectionHeader
            kicker="Onboarding Choice"
            title="Next Step Required"
            description="Please choose an option to customize and unlock the next phase of your career roadmap."
          />
          <div className="mt-4 space-y-4">
            {activeSelNodes.map(node => {
              const isOpen = wizardOpenNodeId === node.id;
              if (isOpen) return null; // If open as a modal, don't show the banner
              
              return (
                <div 
                  key={node.id} 
                  className="border border-cyan-200 bg-white/70 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in"
                >
                  <div className="flex gap-3">
                    <span className="text-2xl mt-0.5">🧭</span>
                    <div>
                      <h4 className="font-extrabold text-[15px] text-cyan-950">Action Required: {node.label}</h4>
                      <p className="text-xs text-cyan-800/80 mt-1 leading-relaxed">
                        {node.id === "node-board-select" && "Choose your Educational Board & high-school Stream to unlock the next phase milestones."}
                        {node.id === "node-ug-select" && "Choose your College Tier & UG Course specialization to unlock college semester goals."}
                        {node.id === "node-postgrad-select" && "Select your post-graduation pathway (Job Placement vs Master's specialization)."}
                        {node.id === "node-masters-select" && "Choose your Master's course specialization to unlock the PG path goals."}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setWizardOpenNodeId(node.id);
                      setWizardStep(1);
                      setManuallyClosedId(null);
                    }}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all shrink-0 w-full sm:w-auto text-center"
                  >
                    {node.id === "node-board-select" && "Choose Board & Stream"}
                    {node.id === "node-ug-select" && "Choose Degree & College"}
                    {node.id === "node-postgrad-select" && "Choose Post-Grad Pathway"}
                    {node.id === "node-masters-select" && "Choose Masters Specialty"}
                  </button>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <Panel className="border-l-4 border-l-emerald-500">
        <SectionHeader
          kicker="Milestone Goals"
          title="Goals to Achieve"
          description="Complete individual stage objectives to unlock future nodes on your Career Mindmap."
        />

        <div className="mt-6 space-y-6">
          {nodesForGoalsList.length > 0 ? (
            nodesForGoalsList.map((node) => {
              const content = (nodeCache || {})[node.id];
              const goals = content?.goals || [];
              const achievements = content?.achievements || [];
              const goalReasons = content?.goal_reasons || {};
              const nodeState = (nodeStates || {})[node.id] || node.state;
              const isCollapsed = !expandedNodeIds.has(node.id);

              const isCheckpoint = node.isCheckpoint || node.type === "checkpoint";

              if (isCheckpoint) {
                return (
                  <div key={node.id} className="border border-amber-200/80 rounded-2xl bg-amber-50/5 shadow-sm flex flex-col overflow-hidden transition-all duration-300">
                    {/* Collapsible Header */}
                    <div 
                      onClick={() => toggleNodeCollapsed(node.id)}
                      className="flex items-center justify-between p-5 cursor-pointer hover:bg-amber-55/40 transition-colors select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-amber-500"
                        />
                        <span className="font-extrabold text-sm text-slate-800">{node.label}</span>
                        <span className="text-[10px] text-amber-700 bg-amber-100 border border-amber-200/80 font-semibold px-2 py-0.5 rounded-full">
                          ⭐ Milestone Checkpoint
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-emerald-800 font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/60">
                          Reached ✓
                        </span>
                        
                        <span className={`text-slate-400 font-bold transition-transform duration-200 text-[10px] shrink-0 ${isCollapsed ? "" : "rotate-180"}`}>
                          ▼
                        </span>
                      </div>
                    </div>

                    {/* Dropdown collapsible list container */}
                    <div className={`transition-all duration-300 ease-in-out border-t border-amber-100/40 ${isCollapsed ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[1000px] opacity-100 p-5 pt-4 bg-amber-50/5"}`}>
                      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                        {content?.summary || `You have reached the ${node.label} stage in your career path. Review your milestone achievements below.`}
                      </p>
                      
                      <div className="grid gap-3">
                        {achievements.length > 0 ? (
                          achievements.map((ach, idx) => (
                            <div 
                              key={idx}
                              className="flex items-start gap-3.5 p-3.5 rounded-xl border border-amber-250/70 bg-white text-slate-800 shadow-sm"
                            >
                              <span className="text-amber-500 text-sm mt-0.5 flex-shrink-0">⭐</span>
                              <div className="flex-1 text-xs leading-relaxed font-semibold">
                                {ach}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 bg-white border border-slate-100 rounded-xl">
                            <p className="text-xs text-slate-400 italic">No achievements generated yet. Open this node on the mindmap to compile your achievements narrative.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Normal goals node rendering
              const completedCount = goals.filter(g => completedGoals.has(g)).length;
              const totalCount = goals.length;

              return (
                <div key={node.id} className="border border-slate-200/85 rounded-2xl bg-white shadow-sm flex flex-col overflow-hidden transition-all duration-300">
                  {/* Collapsible Header */}
                  <div 
                    onClick={() => toggleNodeCollapsed(node.id)}
                    className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
                        style={{ background: node.color }}
                      />
                      <span className="font-extrabold text-sm text-slate-800">{node.label}</span>
                      <span className="text-[10px] text-slate-500 font-semibold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                        {node.timeframe}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Progress Summary Pill */}
                      <span className="text-[10px] text-slate-500 font-bold px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200/60">
                        {completedCount} of {totalCount} goals
                      </span>
                      
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        nodeState === "completed" 
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                      }`}>
                        {nodeState}
                      </span>

                      {/* Dropdown Chevron indicator */}
                      <span className={`text-slate-400 font-bold transition-transform duration-200 text-[10px] shrink-0 ${isCollapsed ? "" : "rotate-180"}`}>
                        ▼
                      </span>
                    </div>
                  </div>

                  {/* Dropdown collapsible list container */}
                  <div className={`transition-all duration-300 ease-in-out border-t border-slate-100/60 ${isCollapsed ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[1000px] opacity-100 p-5 pt-4 bg-slate-50/10"}`}>
                    <div className="grid gap-3">
                      {goals.map((goal, idx) => {
                        const isChecked = completedGoals.has(goal);
                        const whyReason = goalReasons[goal] || "This helps build target career capabilities.";

                        return (
                          <div 
                            key={idx}
                            onClick={() => onToggleGoal(goal)}
                            className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
                              isChecked 
                                ? "bg-emerald-50/20 border-emerald-250 text-slate-800" 
                                : "bg-white border-slate-200 hover:border-slate-350 text-slate-700"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly={true}
                              className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                            />
                            <div className="flex-1 text-sm leading-relaxed">
                              {goal}
                            </div>
                            
                            <button
                              onClick={(e) => e.stopPropagation()} // Stop event bubbling so lightbulb click doesn't toggle completion
                              onMouseEnter={(e) => handleMouseEnter(e, whyReason)}
                              onMouseLeave={handleMouseLeave}
                              className="text-slate-400 hover:text-amber-500 transition-colors p-0.5 flex-shrink-0"
                              aria-label="Why this matters"
                            >
                              💡
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10">
              <span className="text-3xl">🧭</span>
              <p className="text-sm text-slate-500 mt-2 font-medium">No unlocked stages found with checklist goals.</p>
              <p className="text-xs text-slate-400 mt-1">Visit the Career Mindmap first to load your starting path nodes.</p>
            </div>
          )}

          {/* Guided Branch/Option Selection Cards / Banners */}
          {(() => {
            // Find any active/unlocked selection node in flatNodes
            const activeSelNodes = flatNodes.filter(n => {
              if (!n.isSelectionPoint) return false;
              const state = (nodeStates || {})[n.id] || n.state;
              return state === "unlocked" || state === "in_progress";
            });

            // Find any completed selections to show as history/read-only with reset button
            const doneSelNodes = flatNodes.filter(n => {
              if (!n.isSelectionPoint) return false;
              const state = (nodeStates || {})[n.id] || n.state;
              return state === "completed" && (userSelections || {})[n.id];
            });

            // Recommended calculations based on profile
            const fieldType = profile.field?.type || "TECH";
            let recUg = "B.Tech / B.E. (Computer Science/IT)";
            if (fieldType === "SCIENCE") recUg = "B.Sc (Sciences/Biotech)";
            else if (fieldType === "COMMERCE") recUg = "B.Com / BBA (Business/Finance)";
            else if (fieldType === "LAW" || fieldType === "ARTS") recUg = "BA (Arts/Humanities/Law)";
            else if (fieldType === "MEDICINE") recUg = "MBBS / BDS (Medicine)";

            let recPg = "→ Enter Workforce";
            if (profile.goal?.type === "HIGHER_STUDIES") recPg = "→ Masters Degree";

            let recPgCourse = "M.Tech / MS (Computer Science/IT)";
            if (fieldType === "SCIENCE") recPgCourse = "M.Sc (Sciences)";
            else if (fieldType === "COMMERCE") recPgCourse = "MBA (Management/Finance)";
            else if (fieldType === "LAW" || fieldType === "ARTS") recPgCourse = "MA (Arts/Humanities/Law)";

            const wizardNode = flatNodes.find(n => n.id === wizardOpenNodeId);

            return (
              <div className="mt-8 space-y-6 pt-6 border-t border-slate-200/60">

                {/* ── COMPLETED / HISTORIC SELECTIONS ── */}
                {doneSelNodes.length > 0 && (
                  <div className="space-y-3 mt-4 border-t border-slate-100 pt-6">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Locked Selections & Pathways</p>
                    <div className="grid gap-2.5">
                      {doneSelNodes.map(node => (
                        <div key={node.id} className="border border-slate-200/80 rounded-xl p-3.5 bg-slate-50 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-emerald-600 text-xs font-bold">✓</span>
                            <div>
                              <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">{node.label}: </span>
                              <span className="text-xs font-bold text-slate-800">{userSelections[node.id]}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`Do you want to change your selection for "${node.label}"? This will re-lock downstream milestones.`)) {
                                onSelectOption(node.id, undefined);
                              }
                            }}
                            className="text-[10px] font-extrabold text-slate-400 hover:text-rose-600 transition uppercase tracking-wider"
                          >
                            Change
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </Panel>

      {/* Floating fixed portal tooltip */}
      {tooltip && (
        <div
          className="fixed bg-slate-900 border border-slate-800 text-white rounded-xl shadow-2xl p-3.5 max-w-[280px] z-[9999] text-xs leading-normal animate-fadeIn flex gap-2.5 items-start"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
        >
          <span className="text-amber-400 mt-0.5">💡</span>
          <div>
            <p className="font-bold text-slate-400 mb-0.5">Why This Matters</p>
            <p className="text-slate-200">{tooltip.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MilestoneCard({ milestone, index, disabled, checked, onToggle, completedMilestones }) {
  const hasPrereqs = milestone.prerequisites && milestone.prerequisites.length > 0;
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div
      className={`rounded-xl border p-5 transition-all duration-300 flex flex-col gap-4 backdrop-blur-md ${
        disabled
          ? "border-black/5 bg-black/5 opacity-40 text-slate-400"
          : checked
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-950 shadow-inner"
          : "border-black/8 bg-white/55 text-slate-800 hover:border-black/15 hover:shadow-emerald-500/10 hover:-translate-y-0.5"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Tactile Spring Custom Checkbox on the Left */}
        <div
          onClick={() => { if (!disabled) onToggle(milestone.id); }}
          className={`mt-1.5 custom-checkbox shrink-0 ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}`}
        >
          <div className="custom-checkbox-checkmark" />
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded px-2.5 py-0.5 text-xs font-bold border uppercase tracking-wider bg-[#286f8f]/10 text-[#286f8f] border-[#286f8f]/20">
              {milestone.timeframe}
            </span>
            {disabled && (
              <span className="inline-flex items-center gap-1 rounded bg-black/10 px-2 py-0.5 text-xs font-bold text-slate-500 border border-black/5">
                LOCKED
              </span>
            )}
            {!disabled && !checked && (
              <span className="inline-flex items-center gap-1 rounded bg-[#28b7a5]/10 px-2 py-0.5 text-xs font-bold text-teal-800 border border-[#28b7a5]/20 animate-pulse">
                🔓 READY
              </span>
            )}
            {checked && (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-500/30">
                ✓ COMPLETED
              </span>
            )}
          </div>
          
          <h4
            onClick={() => { if (!disabled) onToggle(milestone.id); }}
            className={`mt-3 text-lg font-extrabold transition-all duration-200 cursor-pointer ${
              checked ? "text-emerald-800 line-through opacity-75" : "text-slate-900 hover:text-[#286f8f]"
            }`}
          >
            {milestone.title}
          </h4>
          <p className={`mt-1 text-sm leading-relaxed transition-all duration-200 ${
            checked ? "text-emerald-800/70" : "text-slate-600"
          }`}>
            {milestone.detail}
          </p>
        </div>
      </div>

      {/* More Information toggle button */}
      {hasPrereqs && !disabled && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-2 self-start rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
            expanded
              ? "bg-[#28b7a5]/10 text-teal-800 border border-[#28b7a5]/20"
              : "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 hover:text-slate-900"
          }`}
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
          {expanded ? "Hide Details" : "More Information"}
          <span className={`text-[10px] font-semibold rounded-full px-1.5 py-0.5 ml-1 ${
            expanded ? "bg-[#28b7a5]/20 text-teal-900" : "bg-slate-200 text-slate-600"
          }`}>
            {milestone.prerequisites.length} steps
          </span>
        </button>
      )}

      {/* Expandable sub-goals section */}
      <div
        className="overflow-hidden transition-all duration-500 ease-in-out"
        style={{
          maxHeight: expanded ? `${milestone.prerequisites?.length * 100 + 80}px` : "0px",
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="border-t border-black/10 pt-4">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            <span>Sub-goals to achieve this milestone</span>
            <span className="text-emerald-700">
              {milestone.prerequisites.filter(p => completedMilestones.has(p.id)).length} of {milestone.prerequisites.length} done
            </span>
          </div>
          <div className="grid gap-2">
            {milestone.prerequisites.map((pre, preIdx) => {
              const preChecked = completedMilestones.has(pre.id);
              return (
                <label
                  key={pre.id}
                  onClick={() => { if (!disabled) onToggle(pre.id); }}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-all duration-300 ${
                    disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                  } ${
                    preChecked
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-950 shadow-inner"
                      : "border-black/5 bg-black/5 hover:border-black/10 hover:bg-black/10 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 mt-0.5 shrink-0">
                    <span className="text-xs font-bold text-slate-500 w-4 text-center">{preIdx + 1}</span>
                    <div
                       className={`custom-checkbox shrink-0 ${preChecked ? "checked" : ""} ${disabled ? "disabled" : ""}`}
                    >
                      <div className="custom-checkbox-checkmark" />
                    </div>
                  </div>
                  <span>
                    <span className={`block text-sm font-bold transition-all duration-200 ${
                      preChecked ? "text-emerald-800 line-through opacity-75" : "text-slate-900"
                    }`}>
                      {pre.title}
                    </span>
                    <span className={`mt-0.5 block text-xs transition-all duration-200 ${
                      preChecked ? "text-emerald-700/60" : "text-slate-500"
                    }`}>
                      {pre.detail}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}



function TieredList({ title, items, renderItem }) {
  return (
    <Panel className="border-l-4 border-l-ocean">
      <SectionHeader kicker="Filtered by financial tier" title={title} description="These update instantly when the tier toggle changes." />
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div key={item.id}>{renderItem(item)}</div>
        ))}
      </div>
    </Panel>
  );
}

function CourseCard({ item, overlapReason }) {
  return (
    <div className="relative">
      <InfoCard title={item.name} meta={item.semester} body={item.reason} />
      {overlapReason && (
        <span className="absolute top-4 right-4 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-rose-700 shadow-sm animate-pulse">
          Priority: {overlapReason}
        </span>
      )}
    </div>
  );
}

function InternshipCard({ item }) {
  return <InfoCard title={item.role} meta={item.when} body={`${item.stipendNote} Platforms: ${item.platforms.join(", ")}.`} />;
}

function CertificationCard({ item, checked, onToggle, overlapReason }) {
  return (
    <label
      onClick={() => onToggle(item.id)}
      className={`flex cursor-pointer gap-3 rounded-lg p-4 shadow-sm transition-all duration-300 relative ${
        checked ? "border border-emerald-200 bg-emerald-50/40 shadow-inner" : "card-emerald-glow"
      }`}
    >
      <div
        className={`mt-1 custom-checkbox shrink-0 ${checked ? "checked" : ""}`}
      >
        <div className="custom-checkbox-checkmark" />
      </div>
      <span>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-coral">{item.platform} - {item.cost} - {item.duration}</span>
        <span className={`mt-2 block font-bold transition-all duration-200 ${checked ? "text-emerald-800 line-through opacity-70" : "text-ink"}`}>{item.name}</span>
        <span className={`mt-2 block text-sm transition-all duration-200 ${checked ? "text-emerald-700/60 opacity-60" : "text-slate-600"}`}>{item.impact}</span>
      </span>
      {overlapReason && (
        <span className="absolute top-4 right-4 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-rose-700 shadow-sm animate-pulse">
          Priority: {overlapReason}
        </span>
      )}
    </label>
  );
}

function AlternatePaths({ paths, selectedAlternate, onSelectAlternate }) {
  if (!paths || paths.length === 0) {
    return (
      <div className="grid gap-5">
        <Panel className="border-l-4 border-l-coral">
          <SectionHeader kicker="Same skills, different routes" title="Alternate paths" description="No alternate paths generated for this career profile." />
          <p className="mt-5 text-sm text-slate-500">
            Try updating your onboarding options or target goal to generate alternative career options.
          </p>
        </Panel>
      </div>
    );
  }

  const activePath = selectedAlternate || paths[0];
  return (
    <div className="grid gap-5">
      <Panel className="border-l-4 border-l-coral">
        <SectionHeader kicker="Same skills, different routes" title="Alternate paths" description="Click a path to preview a roadmap for that direction." />
        <div className="mt-5 grid gap-3">
          {paths.map((path) => (
            <button
              key={path.id}
              className={`focus-ring rounded-lg border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft ${
                activePath.id === path.id ? "border-coral bg-[#fff0ea]" : "border-slate-200 bg-white"
              }`}
              type="button"
              onClick={() => onSelectAlternate(path)}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold">{path.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-ocean">{path.salaryRange}</p>
                  <p className="mt-1 text-sm text-slate-600">{path.pivotRequired}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-2xl font-bold text-coral">{path.skillOverlap}%</p>
                  <p className="text-xs text-slate-500">skill overlap</p>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-coral" style={{ width: `${path.skillOverlap}%` }} />
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel className="border-l-4 border-l-ocean">
        <SectionHeader kicker="Preview roadmap" title={activePath.title} description={`How to pivot toward a ${activePath.title.toLowerCase()} career path.`} />
        <div className="mt-5 grid gap-3">
          <article className="rounded-lg border border-slate-200 bg-[#f8fbff] p-4">
            <p className="text-sm font-bold text-ocean">First 3 months</p>
            <p className="mt-2 text-sm text-slate-600">Focus on {activePath.pivotRequired.toLowerCase()} and collect two proof-of-work examples.</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-[#f8fbff] p-4">
            <p className="text-sm font-bold text-ocean">Months 4-12</p>
            <p className="mt-2 text-sm text-slate-600">Build one project directly tied to this path and rewrite your resume around that evidence.</p>
          </article>
          <article className="rounded-lg border border-slate-200 bg-[#fff8f4] p-4">
            <p className="text-sm font-bold text-coral">Year 2+</p>
            <p className="mt-2 text-sm text-slate-600">Apply for {activePath.title.toLowerCase()} roles with a focused portfolio and interview stories.</p>
          </article>
        </div>
      </Panel>
    </div>
  );
}

function SkillGap({ skillGap, profile, completedMilestones }) {
  const baseUserSkills = profile.skills.filter((s) => s !== "None yet");
  const earnedSkills = skillGap.need.filter((item) => completedMilestones.has(item.milestoneId)).map((item) => item.skill);
  const combinedUserSkills = [...baseUserSkills, ...earnedSkills];

  const remainingNeeds = skillGap.need.filter((item) => !completedMilestones.has(item.milestoneId));

  return (
    <div className="grid gap-5">
      <Panel className="border-l-4 border-l-emerald-500">
        <SectionHeader kicker="Your foundation" title="Already have" description="Skills you selected during onboarding, plus skills you've earned from completed milestones." />
        <div className="mt-5 grid gap-3">
          {combinedUserSkills.length > 0 ? (
            combinedUserSkills.map((skill, index) => (
              <article key={`${skill}-${index}`} className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="h-3 w-3 shrink-0 rounded-full bg-emerald-500" />
                <span className="font-bold text-emerald-800">{skill}</span>
              </article>
            ))
          ) : (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No skills earned or selected yet.</p>
          )}
        </div>
      </Panel>

      <Panel className="border-l-4 border-l-amber-400">
        <SectionHeader kicker="Skills to acquire" title="Need next" description="Linked to roadmap milestones — complete the milestone to unlock each skill." />
        <div className="mt-5 grid gap-3">
          {remainingNeeds.length > 0 ? (
            remainingNeeds.map((item) => (
              <article
                key={item.skill}
                className="flex items-center gap-3 rounded-lg border border-amber-200 bg-[#fff8ed] p-4 transition"
              >
                <div className="h-3 w-3 shrink-0 rounded-full bg-amber-400" />
                <div>
                  <span className="block font-bold text-amber-900">{item.skill}</span>
                  <span className="mt-1 block text-sm text-slate-600">
                    Complete the linked roadmap milestone to unlock
                  </span>
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">All skills acquired!</p>
          )}
        </div>
      </Panel>

      <Panel className="border-l-4 border-l-coral">
        <SectionHeader kicker="How to get there" title="Bridge with" description="Practical steps to close the gap between where you are and where you need to be." />
        <div className="mt-5 grid gap-3">
          {skillGap.bridgingSteps.map((step, i) => (
            <article key={i} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-[#fff8f4] p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-coral text-xs font-bold text-white">{i + 1}</span>
              <span className="font-bold text-ink">{step}</span>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ProgressShell({ roadmap, financialTier, progressStats, deepRoadmap }) {
  const baseTotal = getAllMilestones(roadmap).length;
  const deepTotal = deepRoadmap?.weeklyStudyPlan?.length || 0;
  const total = baseTotal + deepTotal;
  const phaseLabels = {
    goalsToAchieve: "Goals achieved",
    shortTerm: "Short-term goals",
    certifications: "Certifications",
    internships: "Internships",
    longTerm: "Long-term goals",
    deepStudy: "Phase 2 Study",
  };

  return (
    <aside className="lg:sticky lg:top-5 lg:self-start">
      <Panel className="overflow-hidden">
        <div className="rounded-lg bg-black/5 p-5 border border-black/5 text-slate-800">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Progress tracker</p>
          <p className="mt-4 text-5xl font-bold">{progressStats.percentage}%</p>
          <p className="mt-2 text-sm text-slate-600">{progressStats.completed} of {progressStats.total} milestones completed.</p>
        </div>
        <div className="mt-5 space-y-4">
          {progressStats.byPhase.map((phase) => (
            <ProgressBar key={phase.phase} label={phaseLabels[phase.phase]} value={phase.percentage} />
          ))}
        </div>
        <div className="mt-5 rounded-lg bg-black/5 border border-black/5 p-4 text-slate-800">
          <p className="text-sm font-bold">Ready milestones</p>
          <p className="mt-1 text-sm text-slate-600">{total} milestones loaded for the {tierLabels[financialTier]} view.</p>
        </div>
        <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
          <p className="text-sm font-bold text-emerald-800">How far you have come</p>
          <p className="mt-1 text-sm text-emerald-700">
            {progressStats.latestCompleted
              ? `Latest: ${progressStats.latestCompleted.title}`
              : "Complete your first milestone to start the mini timeline."}
          </p>
        </div>
      </Panel>
    </aside>
  );
}

function Panel({ children, className = "" }) {
  return <div className={`rounded-lg border border-black/8 bg-white/55 p-5 shadow-xl backdrop-blur-md text-slate-800 ${className}`}>{children}</div>;
}

function SectionHeader({ kicker, title, description }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#286f8f]">{kicker}</p>
      <h2 className="mt-2 text-2xl font-extrabold text-slate-900">{title}</h2>
      <p className="mt-2 text-[15px] font-medium text-slate-700 leading-relaxed">{description}</p>
    </div>
  );
}

function MetricCard({ label, value, color }) {
  return (
    <article className="rounded-lg border border-black/8 bg-white/55 p-5 shadow-xl backdrop-blur-md text-slate-800">
      <div className={`mb-4 h-2 w-16 rounded-full ${color}`} />
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold text-slate-900">{value}</p>
    </article>
  );
}

function InfoCard({ title, meta, body }) {
  return (
    <article className="h-full rounded-lg border border-black/8 bg-white/55 p-4 shadow-sm backdrop-blur-md text-slate-800 transition hover:-translate-y-0.5 hover:shadow-emerald-500/10">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-coral">{meta}</p>
      <h3 className="mt-2 font-extrabold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{body}</p>
    </article>
  );
}

function ProgressBar({ label, value }) {
  return (
    <div>
      <div className="flex justify-between text-sm font-semibold text-slate-700">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-black/10">
        <div className="h-full rounded-full bg-[#28b7a5]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function formatGoalType(goalType) {
  return goalType.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
