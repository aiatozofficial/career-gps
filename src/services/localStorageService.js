const STORAGE_KEYS = {
  profile: "career-gps:student-profile",
  roadmap: "career-gps:roadmap",
  financialTier: "career-gps:financial-tier",
  progress: "career-gps:completed-milestones",
  deepRoadmap: "career-gps:deep-roadmap",
  resumeAnalysis: "career-gps:resume-analysis",
  marketIntel: "career-gps:market-intel",
  chatHistory: "career-gps:chat-history",
  mindmapExpanded: "career-gps:mindmap-expanded",
  mindmapZoom: "career-gps:mindmap-zoom",
  // Bug fix: this key was used directly in RoadmapDashboard but missing here,
  // so clearCareerGpsStorage() never cleared it — deep-week progress leaked across resets.
  deepWeeks: "career-gps:completed-deep-weeks",
  // New: lazy-loading mindmap state
  nodeCache: "career-gps:node-content-cache",       // Map<nodeId, nodeContent>
  nodeStates: "career-gps:node-states",             // Map<nodeId, state string>
  completedGoals: "career-gps:completed-goals-list", // string[] of completed goal texts
  userSelections: "career-gps:user-selections",     // Map<nodeId, optionText>
};

/**
 * Bug #15 fix: safely parse JSON from storage.
 * Returns `fallback` if the value is missing, null, or contains corrupt JSON
 * (e.g. truncated write from a previous crash, browser extension injection, or
 * storage quota overflow mid-write).
 */
function safeParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed === null ? fallback : parsed;
  } catch {
    console.warn("[localStorageService] Discarding corrupt storage value:", raw?.slice?.(0, 80));
    return fallback;
  }
}

function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (err) {
    console.warn(`[localStorageService] Failed to write key "${key}" to localStorage:`, err);
    if (err.name === "QuotaExceededError" || err.name === "NS_ERROR_DOM_QUOTA_REACHED") {
      try {
        console.warn("[localStorageService] Quota exceeded. Attempting recovery by clearing node content cache...");
        localStorage.removeItem(STORAGE_KEYS.nodeCache);
        localStorage.setItem(key, value);
        console.log("[localStorageService] Quota recovery successful after clearing node cache.");
        return;
      } catch (retryErr) {
        console.error("[localStorageService] Quota recovery failed. Clearing chat history as last resort...", retryErr);
        try {
          localStorage.removeItem(STORAGE_KEYS.chatHistory);
          localStorage.setItem(key, value);
          console.log("[localStorageService] Quota recovery successful after clearing chat history.");
          return;
        } catch (finalErr) {
          console.error("[localStorageService] Critical: localStorage is completely full.", finalErr);
        }
      }
    }
  }
}

export function saveStudentProfile(profile) {
  safeSetItem(STORAGE_KEYS.profile, JSON.stringify(profile));
}

export function loadStudentProfile() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.profile), null);
}

export function saveRoadmap(roadmap) {
  safeSetItem(STORAGE_KEYS.roadmap, JSON.stringify(roadmap));
}

export function loadRoadmap() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.roadmap), null);
}

export function saveFinancialTier(financialTier) {
  safeSetItem(STORAGE_KEYS.financialTier, financialTier);
}

export function loadFinancialTier() {
  return localStorage.getItem(STORAGE_KEYS.financialTier);
}

export function saveCompletedMilestones(completedMilestones) {
  safeSetItem(STORAGE_KEYS.progress, JSON.stringify([...completedMilestones]));
}

export function loadCompletedMilestones() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.progress), []);
}

export function saveCompletedDeepWeeks(weekIds) {
  safeSetItem(STORAGE_KEYS.deepWeeks, JSON.stringify(weekIds));
}

export function loadCompletedDeepWeeks() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.deepWeeks), []);
}

export function saveDeepRoadmap(deepRoadmap) {
  safeSetItem(STORAGE_KEYS.deepRoadmap, JSON.stringify(deepRoadmap));
}

export function loadDeepRoadmap() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.deepRoadmap), null);
}

export function saveResumeAnalysis(analysis) {
  safeSetItem(STORAGE_KEYS.resumeAnalysis, JSON.stringify(analysis));
}

export function loadResumeAnalysis() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.resumeAnalysis), null);
}

export function saveMarketIntel(intel) {
  safeSetItem(STORAGE_KEYS.marketIntel, JSON.stringify(intel));
}

export function loadMarketIntel() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.marketIntel), null);
}

export function saveChatHistory(history) {
  safeSetItem(STORAGE_KEYS.chatHistory, JSON.stringify(history));
}

export function loadChatHistory() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.chatHistory), []);
}

export function saveMindmapExpandedNodes(nodeIds) {
  try {
    sessionStorage.setItem(STORAGE_KEYS.mindmapExpanded, JSON.stringify([...nodeIds]));
  } catch (e) { /* sessionStorage might not be available */ }
}

export function loadMindmapExpandedNodes() {
  try {
    return safeParse(sessionStorage.getItem(STORAGE_KEYS.mindmapExpanded), null);
  } catch (e) { return null; }
}

export function saveMindmapZoom(transform) {
  try {
    sessionStorage.setItem(STORAGE_KEYS.mindmapZoom, JSON.stringify(transform));
  } catch (e) { /* sessionStorage might not be available */ }
}

export function loadMindmapZoom() {
  try {
    return safeParse(sessionStorage.getItem(STORAGE_KEYS.mindmapZoom), null);
  } catch (e) { return null; }
}

export function clearCareerGpsStorage() {
  // Clear all localStorage keys starting with 'career-gps:'
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith("career-gps:")) {
      localStorage.removeItem(key);
    }
  }
  // Clear all sessionStorage keys starting with 'career-gps:'
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith("career-gps:")) {
        sessionStorage.removeItem(key);
      }
    }
  } catch (e) {}
}

// ─────────────────────────────────────────────────────────
// Node Content Cache — stores lazy-loaded AI content per node
// ─────────────────────────────────────────────────────────

export function saveNodeCache(cache) {
  // cache is a plain object: { [nodeId]: nodeContent }
  safeSetItem(STORAGE_KEYS.nodeCache, JSON.stringify(cache));
}

export function loadNodeCache() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.nodeCache), {}) || {};
}

// ─────────────────────────────────────────────────────────
// Node States — tracks lock/unlock/completed state per node
// ─────────────────────────────────────────────────────────

export function saveNodeStates(states) {
  // states is a plain object: { [nodeId]: "locked" | "unlocked" | "in_progress" | "completed" }
  safeSetItem(STORAGE_KEYS.nodeStates, JSON.stringify(states));
}

export function loadNodeStates() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.nodeStates), {}) || {};
}

// ─────────────────────────────────────────────────────────
// Completed Goals List — for zero-repetition in API calls
// ─────────────────────────────────────────────────────────

export function saveCompletedGoalsList(goalTexts) {
  safeSetItem(STORAGE_KEYS.completedGoals, JSON.stringify(goalTexts));
}

export function loadCompletedGoalsList() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.completedGoals), []) || [];
}

// ─────────────────────────────────────────────────────────
// User Selections — choice nodes
// ─────────────────────────────────────────────────────────

export function saveUserSelections(selections) {
  safeSetItem(STORAGE_KEYS.userSelections, JSON.stringify(selections));
}

export function loadUserSelections() {
  return safeParse(localStorage.getItem(STORAGE_KEYS.userSelections), {}) || {};
}

// ─────────────────────────────────────────────────────────
// Dynamic Selection Preferences
// ─────────────────────────────────────────────────────────

export function saveSelProgression(profileName, progression) {
  safeSetItem(`career-gps:sel-progression-${profileName}`, progression);
}

export function loadSelProgression(profileName) {
  return localStorage.getItem(`career-gps:sel-progression-${profileName}`) || "";
}

export function saveSelMastersTier(profileName, tier) {
  safeSetItem(`career-gps:sel-masters-tier-${profileName}`, tier);
}

export function loadSelMastersTier(profileName) {
  return localStorage.getItem(`career-gps:sel-masters-tier-${profileName}`) || "";
}
