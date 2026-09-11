import { useEffect, useState } from "react";
import GeneratingScreen from "./components/GeneratingScreen";
import OnboardingWizard from "./components/onboarding/OnboardingWizard";
import RoadmapDashboard from "./components/roadmap/RoadmapDashboard";
import CareerMindmapView from "./components/roadmap/CareerMindmapView";
import TimelineView from "./components/timeline/TimelineView";
import WelcomePage from "./components/WelcomePage";
import ErrorBoundary from "./components/ErrorBoundary";
import { generateMockRoadmap } from "./data/mockRoadmapGenerator";
import {
  loadFinancialTier,
  loadRoadmap,
  loadStudentProfile,
  saveRoadmap,
  saveStudentProfile,
  clearCareerGpsStorage,
} from "./services/localStorageService";

import { parseRoadmap, parseStudentProfile } from "./schemas/roadmapSchemas";
import { processRoadmapForHistory } from "./utils/roadmapHelpers";

const VIEWS = {
  welcome: "WELCOME",
  onboarding: "ONBOARDING",
  generating: "GENERATING",
  timeline: "TIMELINE",
  roadmap: "ROADMAP",
  mindmap: "MINDMAP",
};

export default function App() {
  const [view, setView] = useState(VIEWS.welcome);
  const [profile, setProfile] = useState(null);
  const [roadmap, setRoadmap] = useState(null);
  const [savedFinancialTier, setSavedFinancialTier] = useState(null);

  useEffect(() => {
    try {
      const savedProfile = loadStudentProfile();
      const savedRoadmap = loadRoadmap();

      if (savedProfile && savedRoadmap) {
        setProfile(parseStudentProfile(savedProfile));
        setRoadmap(parseRoadmap(savedRoadmap));
        setSavedFinancialTier(loadFinancialTier());
        setView(VIEWS.roadmap);
      }
    } catch (error) {
      console.warn("Stored Career GPS data failed validation and will be ignored.", error);
      clearCareerGpsStorage();
    }
  }, []);

  async function handleProfileComplete(nextProfile) {
    setProfile(nextProfile);
    saveStudentProfile(nextProfile);
    setView(VIEWS.generating);

    try {
      const response = await fetch("/api/init-roadmap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextProfile),
      });

      if (!response.ok) {
        let errData = {};
        try {
          errData = await response.json();
        } catch (_) {}
        throw new Error(errData.details || errData.error || `HTTP error! Status: ${response.status}`);
      }

      const generatedRoadmap = await response.json();
      const processedRoadmap = processRoadmapForHistory(generatedRoadmap, nextProfile);
      const parsedRoadmap = parseRoadmap(processedRoadmap);
      
      setRoadmap(parsedRoadmap);
      saveRoadmap(parsedRoadmap);
      // After generation, go to the Mindmap view automatically
      setView(VIEWS.mindmap);
    } catch (error) {
      console.warn("Gemini API unavailable — using offline Career Roadmap generator.", error.message);
      
      try {
        const generatedRoadmap = generateMockRoadmap(nextProfile);
        const processedRoadmap = processRoadmapForHistory(generatedRoadmap, nextProfile);
        const parsedRoadmap = parseRoadmap(processedRoadmap);
        setRoadmap(parsedRoadmap);
        saveRoadmap(parsedRoadmap);
        // After fallback generation, also go to Mindmap
        setView(VIEWS.mindmap);
      } catch (fallbackError) {
        console.error("Critical: Fallback mock generation failed.", fallbackError);
        alert("An unexpected error occurred during fallback generation. Resetting onboarding.");
        handleReset();
      }
    }
  }

  // Bug #10 fix: clear localStorage so stale profile/roadmap are not
  // restored on next page load, making the reset button appear broken.
  function handleReset() {
    clearCareerGpsStorage();
    setProfile(null);
    setRoadmap(null);
    setSavedFinancialTier(null);
    setView(VIEWS.welcome);
  }

  if (view === VIEWS.generating) {
    return <GeneratingScreen />;
  }

  if (view === VIEWS.timeline && profile && roadmap) {
    return (
      <ErrorBoundary onReset={handleReset}>
        <TimelineView
          profile={profile}
          roadmap={roadmap}
          onGoToDashboard={() => setView(VIEWS.roadmap)}
          onReset={handleReset}
          onProfileUpdate={handleProfileComplete}
        />
      </ErrorBoundary>
    );
  }

  if (view === VIEWS.roadmap && profile && roadmap) {
    return (
      <ErrorBoundary onReset={handleReset}>
        <RoadmapDashboard
          profile={profile}
          roadmap={roadmap}
          initialFinancialTier={savedFinancialTier}
          onReset={handleReset}
          onViewTimeline={() => setView(VIEWS.timeline)}
          onViewMindmap={() => setView(VIEWS.mindmap)}
          onProfileUpdate={handleProfileComplete}
        />
      </ErrorBoundary>
    );
  }

  if (view === VIEWS.mindmap && profile && roadmap) {
    return (
      <ErrorBoundary onReset={handleReset}>
        <CareerMindmapView
          profile={profile}
          roadmap={roadmap}
          onGoToDashboard={() => setView(VIEWS.roadmap)}
        />
      </ErrorBoundary>
    );
  }

  if (view === VIEWS.onboarding) {
    return <OnboardingWizard onComplete={handleProfileComplete} />;
  }

  return <WelcomePage onGetStarted={() => setView(VIEWS.onboarding)} />;
}
