import { useCallback, useMemo, useRef, useState } from "react";
import { parseStudentProfile } from "../../schemas/roadmapSchemas";
import { getDescription } from "../../data/onboardingDescriptions";
import { getFallbackSkills } from "../../utils/roadmapHelpers";
import { WebGLShader } from "@/components/ui/web-gl-shader";

const stageAgeDefaults = {
  CLASS_7_8: 12,
  CLASS_9_10: 14,
  CLASS_11_12: 16,
  UNDERGRADUATE: 18,
  POSTGRADUATE: 22,
  WORKING: 24,
};

const stages = [
  ["CLASS_7_8", "Class 7-8"],
  ["CLASS_9_10", "Class 9-10"],
  ["CLASS_11_12", "Class 11-12"],
  ["UNDERGRADUATE", "Undergraduate"],
  ["POSTGRADUATE", "Postgraduate"],
  ["WORKING", "Working"],
];

const fields = [
  ["TECH", "Tech"],
  ["SCIENCE", "Science"],
  ["COMMERCE", "Commerce"],
  ["ARTS", "Arts"],
  ["LAW", "Law"],
  ["MEDICINE", "Medicine"],
  ["DESIGN", "Design"],
  ["OTHER", "Other"],
];

const sharedSkills = ["Documentation", "Communication", "Research", "Teamwork", "Public speaking", "Presentation"];
const fieldSkills = {
  TECH: ["Python", "JavaScript", "Excel", "SQL", "Problem solving", "Git"],
  SCIENCE: ["Lab basics", "Observation", "Data recording", "Math", "Scientific writing", "Experiment design"],
  COMMERCE: ["Accounting basics", "Excel", "Market research", "Budgeting", "Business analysis", "Data entry"],
  ARTS: ["Writing", "Sketching", "Creative thinking", "Storytelling", "Visual analysis", "Content planning"],
  LAW: ["Reading cases", "Argumentation", "Legal research", "Drafting", "Debate", "Critical thinking"],
  MEDICINE: ["Biology basics", "Chemistry basics", "First aid awareness", "Memorization", "Patient empathy", "Observation"],
  DESIGN: ["Figma", "Sketching", "Color theory", "User research", "Visual design", "Prototyping"],
  OTHER: [],
};

const goalTypes = [
  ["JOB_ROLE", "Job role"],
  ["STARTUP", "Entrepreneurship"],
  ["HIGHER_STUDIES", "Higher studies"],
  ["NOT_SURE", "Not sure yet"],
];
const tiers = [
  ["HIGH", "Self-funded", "I can invest in courses and paid tools."],
  ["MEDIUM", "Affordable", "Free plus low-cost courses work best for me."],
  ["LOW", "Free only", "I rely on free resources and scholarships."],
];
const preferences = ["Prefer online", "Prefer local", "Open to relocation", "Scholarship required"];

const initialProfile = {
  name: "",
  stage: "",
  age: 18,
  field: {
    type: "",
    customValue: "",
  },
  skills: [],
  customSkillInput: "",
  goal: {
    type: "",
    description: "",
  },
  financialTier: "",
  preferences: [],
  prepStyle: "",
  academicFocus: "Balanced",
  timeCommitment: "Balanced",
  collegeEnvironment: "",
  startStage: "",
};

export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState(initialProfile);
  const [error, setError] = useState("");
  const [hoveredInfo, setHoveredInfo] = useState(null);
  const hoverTimeoutRef = useRef(null);

  const [dynamicSkills, setDynamicSkills] = useState([]);
  const [loadingSkills, setLoadingSkills] = useState(false);

  const fetchDynamicSkills = async (fieldType, customFieldValue) => {
    if (fieldType !== "OTHER" || !customFieldValue.trim()) {
      setDynamicSkills([]);
      return;
    }

    setLoadingSkills(true);
    try {
      const response = await fetch("/api/suggest-skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldType, customFieldValue })
      });

      if (!response.ok) {
        throw new Error("Failed to suggest skills");
      }

      const data = await response.json();
      if (Array.isArray(data.skills) && data.skills.length > 0) {
        setDynamicSkills(data.skills);
      } else {
        setDynamicSkills(getFallbackSkills(customFieldValue));
      }
    } catch (err) {
      console.warn("Suggest skills API failed, using fallback.", err);
      setDynamicSkills(getFallbackSkills(customFieldValue));
    } finally {
      setLoadingSkills(false);
    }
  };

  const handleHover = useCallback((category, key) => {
    clearTimeout(hoverTimeoutRef.current);
    const info = getDescription(category, key);
    if (info) {
      setHoveredInfo(info);
    }
  }, []);

  const handleHoverLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredInfo(null);
    }, 200);
  }, []);

  const steps = useMemo(() => {
    const list = [
      {
        title: "What's your name?",
        prompt: "Let's build your GPS with a profile that feels personal.",
        hoverCategory: null,
        isComplete: (profile) => profile.name.trim().length > 0,
        render: ({ profile, updateProfile }) => (
          <input
            className="focus-ring w-full rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-lg text-white placeholder-white/30"
            value={profile.name}
            placeholder="Your name"
            onChange={(event) => updateProfile({ name: event.target.value })}
          />
        ),
      },
      {
        title: "Where are you right now?",
        prompt: "Choose the education or work stage that best matches you.",
        hoverCategory: "stages",
        isComplete: (profile) => Boolean(profile.stage),
        render: ({ profile, updateProfile, onHover, onLeave }) => (
          <OptionGrid
            options={stages}
            selected={profile.stage}
            onSelect={(stage) => updateProfile({
              stage,
              age: stageAgeDefaults[stage],
            })}
            hoverCategory="stages"
            onHover={onHover}
            onLeave={onLeave}
          />
        ),
      },
      {
        title: "How old are you?",
        prompt: "This keeps the roadmap realistic for your current stage.",
        hoverCategory: null,
        isComplete: (profile) => profile.age >= 12 && profile.age <= 40,
        render: ({ profile, updateProfile }) => (
          <div>
            <input
              className="w-full accent-[#28b7a5]"
              type="range"
              min="12"
              max="40"
              value={profile.age}
              onChange={(event) => updateProfile({ age: Number(event.target.value) })}
            />
            <p className="mt-5 text-center text-5xl font-bold text-white">{profile.age}</p>
          </div>
        ),
      },
      {
        title: "What field are you drawn to?",
        prompt: "Pick the closest match, or add your own field.",
        hoverCategory: "fields",
        isComplete: (profile) => Boolean(profile.field.type) && (profile.field.type !== "OTHER" || profile.field.customValue.trim().length > 0),
        render: ({ profile, updateProfile, onHover, onLeave }) => (
          <div className="space-y-5">
            <OptionGrid
              options={fields}
              selected={profile.field.type}
              onSelect={(fieldType) =>
                updateProfile({
                  field: { type: fieldType, customValue: "" },
                  skills: [],
                  customSkillInput: "",
                })
              }
              hoverCategory="fields"
              onHover={onHover}
              onLeave={onLeave}
            />
            {profile.field.type === "OTHER" ? (
              <input
                className="focus-ring w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30"
                value={profile.field.customValue}
                placeholder="Type the field you are interested in"
                onChange={(event) => updateProfile({ field: { ...profile.field, customValue: event.target.value } })}
              />
            ) : null}
          </div>
        ),
      },
      {
        title: "Pick skills you already have",
        prompt: "These are tuned to your field, with a few useful skills shared across all fields.",
        hoverCategory: "skills",
        isComplete: (profile) => profile.skills.length > 0,
        render: ({ profile, updateProfile, toggleListValue, addCustomSkill, onHover, onLeave }) => {
          if (loadingSkills) {
            return (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <div className="w-12 h-12 border-4 border-ocean border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-slate-500 animate-pulse">
                  Analyzing "{profile.field.customValue || 'your field'}" to tailor specific skills...
                </p>
              </div>
            );
          }

          return (
            <div className="space-y-5">
              <ChipGrid
                options={getSkillOptions(profile.field.type, profile.skills, dynamicSkills)}
                selected={profile.skills}
                onToggle={(skill) => toggleListValue("skills", skill)}
                hoverCategory="skills"
                onHover={onHover}
                onLeave={onLeave}
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  className="focus-ring min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30"
                  value={profile.customSkillInput}
                  placeholder="Add your own skill"
                  onChange={(event) => updateProfile({ customSkillInput: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addCustomSkill();
                    }
                  }}
                />
                <button
                  className="focus-ring rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white"
                  type="button"
                  onClick={addCustomSkill}
                >
                  Add skill
                </button>
              </div>
            </div>
          );
        },
      },
      {
        title: "What's your dream direction?",
        prompt: "Choose the direction. The next step will ask one focused follow-up.",
        hoverCategory: "goalTypes",
        isComplete: (profile) => Boolean(profile.goal.type),
        render: ({ profile, updateProfile, onHover, onLeave }) => (
          <OptionGrid
            options={goalTypes}
            selected={profile.goal.type}
            onSelect={(type) => updateProfile({ goal: { type, description: "" } })}
            hoverCategory="goalTypes"
            onHover={onHover}
            onLeave={onLeave}
          />
        ),
      },
      {
        title: (profile) => {
          switch (profile.goal.type) {
            case "JOB_ROLE": return "What role are you aiming for?";
            case "STARTUP": return "What kind of startup?";
            case "HIGHER_STUDIES": return "What is your target course?";
            case "NOT_SURE": return "We'll help you explore";
            default: return "Add a little more detail";
          }
        },
        prompt: (profile) => {
          switch (profile.goal.type) {
            case "JOB_ROLE": return "Type a specific role, or pick a suggestion based on your skills.";
            case "STARTUP": return "Describe the problem you want to solve or the product you want to build.";
            case "HIGHER_STUDIES": return "Tell us the degree or domain you want to pursue next.";
            case "NOT_SURE": return "Career GPS will generate a practical roadmap to help you find your direction.";
            default: return "This keeps the mock roadmap pointed at your chosen direction.";
          }
        },
        hoverCategory: null,
        isComplete: (profile) => profile.goal.type === "NOT_SURE" || profile.goal.description.trim().length > 0,
        render: ({ profile, updateProfile }) => {
          const detail = getGoalDetail(profile);

          if (profile.goal.type === "NOT_SURE") {
            return (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-5">
                <p className="text-sm font-bold text-emerald-300">No problem. Career GPS will start exploratory.</p>
                <p className="mt-2 text-sm text-slate-200">{buildExploratoryGoal(profile)}</p>
              </div>
            );
          }

          return (
            <div className="space-y-5">
              <input
                className="focus-ring w-full rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-lg text-white placeholder-white/30"
                value={profile.goal.description}
                placeholder={detail.placeholder}
                onChange={(event) => updateProfile({ goal: { ...profile.goal, description: event.target.value } })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {detail.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    className="focus-ring rounded-lg border border-white/10 bg-white/5 p-4 text-left text-sm font-semibold text-slate-200 hover:border-[#28b7a5]/40 hover:bg-[#28b7a5]/10 hover:text-white"
                    type="button"
                    onClick={() => updateProfile({ goal: { ...profile.goal, description: suggestion } })}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          );
        },
      },
      {
        title: "How do you prefer to study or prepare?",
        prompt: "This helps us tailor the resources and pacing in your roadmap.",
        hoverCategory: null,
        isComplete: (profile) => Boolean(profile.prepStyle),
        render: ({ profile, updateProfile }) => (
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Self-study", "Self-study", "I learn well on my own with online resources and free courses."],
              ["Coaching", "Coaching / Tuition", "I prefer structured classes, coaching centres, or tutors."],
              ["Hybrid", "Hybrid (Both)", "I use a mix of self-study and coaching depending on the subject."],
              ["College-led", "College-led", "I rely primarily on my college/school curriculum and faculty."],
            ].map(([value, label, desc]) => (
              <button
                key={value}
                className={`focus-ring rounded-lg border p-4 text-left transition ${
                  profile.prepStyle === value
                    ? "border-[#28b7a5] bg-[#28b7a5]/20 text-[#6ee7b7] shadow-[0_0_12px_rgba(40,183,165,0.25)]"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
                }`}
                type="button"
                onClick={() => updateProfile({ prepStyle: value })}
              >
                <span className="font-bold block mb-1">{label}</span>
                <span className={`text-sm font-normal ${profile.prepStyle === value ? "text-[#a7f3d0]" : "text-slate-400"}`}>{desc}</span>
              </button>
            ))}
          </div>
        ),
      },
      {
        title: "What is your main academic focus?",
        prompt: "Helps balance exams, placements, and early skill exploration.",
        hoverCategory: null,
        isComplete: (profile) => Boolean(profile.academicFocus),
        render: ({ profile, updateProfile }) => (
          <div className="grid gap-3">
            {[
              ["Board Exams Only", "Maximize Board / University Exams", "Focus completely on clearing boards with high grades."],
              ["Entrance Competitive", "Top Competitive Entrance Rank", "Maximize scores in competitive tests to enter top tier universities."],
              ["Balanced", "Academic-Skill Balance", "Excel in standard academics while spending 2-4 hours/week building early projects."]
            ].map(([value, label, desc]) => (
              <button
                key={value}
                className={`focus-ring rounded-lg border p-4 text-left transition ${
                  profile.academicFocus === value
                    ? "border-[#28b7a5] bg-[#28b7a5]/20 text-[#6ee7b7] shadow-[0_0_12px_rgba(40,183,165,0.25)]"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
                }`}
                type="button"
                onClick={() => updateProfile({ academicFocus: value })}
              >
                <span className="font-bold block mb-1">{label}</span>
                <span className={`text-sm font-normal ${profile.academicFocus === value ? "text-[#a7f3d0]" : "text-slate-400"}`}>{desc}</span>
              </button>
            ))}
          </div>
        ),
      },
      {
        title: "How much spare time can you dedicate weekly?",
        prompt: "This adjusts the density of external projects and certifications.",
        hoverCategory: null,
        isComplete: (profile) => Boolean(profile.timeCommitment),
        render: ({ profile, updateProfile }) => (
          <div className="grid gap-3">
            {[
              ["Light", "Light Commitment (2-4 hours/week)", "Focus primarily on school/college, keeping external work minimal."],
              ["Balanced", "Balanced Commitment (5-10 hours/week)", "Blend core studies with weekly coding, projects, and certifications."],
              ["Intensive", "Intensive Commitment (12+ hours/week)", "Accelerated timeline targeting top internships and open-source contributions."]
            ].map(([value, label, desc]) => (
              <button
                key={value}
                className={`focus-ring rounded-lg border p-4 text-left transition ${
                  profile.timeCommitment === value
                    ? "border-[#28b7a5] bg-[#28b7a5]/20 text-[#6ee7b7] shadow-[0_0_12px_rgba(40,183,165,0.25)]"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
                }`}
                type="button"
                onClick={() => updateProfile({ timeCommitment: value })}
              >
                <span className="font-bold block mb-1">{label}</span>
                <span className={`text-sm font-normal ${profile.timeCommitment === value ? "text-[#a7f3d0]" : "text-slate-400"}`}>{desc}</span>
              </button>
            ))}
          </div>
        ),
      },
      {
        title: "What best describes your budget?",
        prompt: "This helps Career GPS recommend paths you can actually use.",
        hoverCategory: "financialTiers",
        isComplete: (profile) => Boolean(profile.financialTier),
        render: ({ profile, updateProfile, onHover, onLeave }) => (
          <div className="grid gap-3">
            {tiers.map(([value, label, description]) => (
              <button
                key={value}
                className={`focus-ring rounded-lg border p-4 text-left transition ${
                  profile.financialTier === value
                    ? "border-[#28b7a5] bg-[#28b7a5]/20 text-[#6ee7b7] shadow-[0_0_12px_rgba(40,183,165,0.25)]"
                    : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
                }`}
                type="button"
                onClick={() => updateProfile({ financialTier: value })}
                onMouseEnter={() => onHover("financialTiers", value)}
                onMouseLeave={onLeave}
              >
                <span className="font-bold">{label}</span>
                <span className={`mt-1 block text-sm ${profile.financialTier === value ? "text-[#a7f3d0]" : "text-slate-400"}`}>{description}</span>
              </button>
            ))}
          </div>
        ),
      },
      {
        title: "Any constraints we should know?",
        prompt: "These preferences shape the roadmap later. You can skip if none apply.",
        hoverCategory: "preferences",
        isComplete: () => true,
        render: ({ profile, toggleListValue, onHover, onLeave }) => (
          <ChipGrid
            options={preferences}
            selected={profile.preferences}
            onToggle={(preference) => toggleListValue("preferences", preference)}
            hoverCategory="preferences"
            onHover={onHover}
            onLeave={onLeave}
          />
        ),
      }
    ];

    return list;
  }, [profile.stage, profile.field.type, profile.goal.type, profile.skills, dynamicSkills, loadingSkills]);

  const progress = ((step + 1) / steps.length) * 100;
  const currentStep = steps[step];
  const canContinue = useMemo(() => currentStep.isComplete(profile), [currentStep, profile]);
  const hasInfoPanel = currentStep.hoverCategory !== null;

  function updateProfile(patch) {
    setError("");
    setProfile((current) => ({ ...current, ...patch }));
  }

  function toggleListValue(key, value) {
    setError("");
    setProfile((current) => {
      const currentValues = current[key];
      let nextValues;

      if (key === "skills" && value === "None yet") {
        nextValues = currentValues.includes(value) ? [] : ["None yet"];
      } else if (key === "skills") {
        const valuesWithoutNone = currentValues.filter((item) => item !== "None yet");
        nextValues = valuesWithoutNone.includes(value)
          ? valuesWithoutNone.filter((item) => item !== value)
          : [...valuesWithoutNone, value];
      } else {
        nextValues = currentValues.includes(value)
          ? currentValues.filter((item) => item !== value)
          : [...currentValues, value];
      }

      return { ...current, [key]: nextValues };
    });
  }

  function addCustomSkill() {
    const value = profile.customSkillInput.trim();
    if (!value) return;

    setError("");
    setProfile((current) => {
      const skillsWithoutNone = current.skills.filter((skill) => skill !== "None yet");
      return {
        ...current,
        customSkillInput: "",
        skills: skillsWithoutNone.includes(value) ? skillsWithoutNone : [...skillsWithoutNone, value],
      };
    });
  }

  function handleNext() {
    if (!canContinue) return;
    setHoveredInfo(null);

    // Trigger dynamic skills loading when leaving the Field Selection step
    if (steps[step]?.title === "What field are you drawn to?") {
      fetchDynamicSkills(profile.field.type, profile.field.customValue);
    }

    if (step < steps.length - 1) {
      setStep((value) => value + 1);
      return;
    }

    try {
      const goalDescription =
        profile.goal.type === "NOT_SURE" && !profile.goal.description.trim()
          ? buildExploratoryGoal(profile)
          : profile.goal.description;

      let startedInPhase1 = false;
      let startedInPhase2 = false;
      let startedInPhase3 = false;
      let maxPhase = 1;
      
      if (profile.stage === "CLASS_7_8") {
         startedInPhase1 = true;
         maxPhase = 4;
      } else if (profile.stage === "CLASS_9_10") {
         startedInPhase2 = true;
         maxPhase = 3;
      } else if (profile.stage === "CLASS_11_12") {
         startedInPhase2 = true;
         maxPhase = 2;
      } else if (profile.stage === "UNDERGRADUATE") {
         startedInPhase3 = true;
         maxPhase = 2;
      } else if (profile.stage === "POSTGRADUATE") {
         startedInPhase3 = true;
      }

      const { customSkillInput, ...normalizedProfile } = {
        ...profile,
        onboardingPhase: maxPhase,
        startStage: profile.stage,
        startedInPhase1: profile.startedInPhase1 ?? startedInPhase1,
        startedInPhase2: profile.startedInPhase2 ?? startedInPhase2,
        startedInPhase3: profile.startedInPhase3 ?? startedInPhase3,
        goal: { ...profile.goal, description: goalDescription },
        skills: profile.skills.includes("None yet") ? ["None yet"] : profile.skills,
      };
      onComplete(parseStudentProfile(normalizedProfile));
    } catch (validationError) {
      setError(validationError.issues?.[0]?.message ?? "Please check your answers.");
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-black px-5 py-8 overflow-hidden">
      {/* Background Shader & Contrast Protection Overlay */}
      <WebGLShader />
      <div className="absolute inset-0 bg-[#0c1524]/65 pointer-events-none z-0" />

      <div className={`onboarding-layout relative z-10 ${hasInfoPanel ? "onboarding-layout--with-panel" : ""}`}>
        {/* ── Main Form Card ── */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canContinue) handleNext();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              // Let buttons and the custom skill input handle their own Enter key presses
              if (
                document.activeElement &&
                (document.activeElement.placeholder === "Add your own skill" ||
                 document.activeElement.tagName === "BUTTON")
              ) {
                return;
              }
              event.preventDefault();
              if (canContinue) handleNext();
            }
          }}
          className="onboarding-form w-full rounded-xl holographic-card text-white p-6 shadow-2xl md:p-9 relative z-10 transition-all duration-300 ease-out"
        >
          <div className="holo-glow"></div>
          
          <div className="mb-8 relative z-10">
            <div className="flex items-center justify-between gap-4 text-sm font-semibold text-slate-300">
              <span>Step {step + 1} of {steps.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#28b7a5] transition-all shadow-[0_0_8px_rgba(40,183,165,0.6)]" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8fd5c0] relative z-10">Career GPS</p>
          <h1 className="mt-3 text-3xl font-black text-white md:text-4xl relative z-10">
            {typeof currentStep.title === "function" ? currentStep.title(profile) : currentStep.title}
          </h1>
          <p className="mt-3 text-slate-200 relative z-10 font-medium">
            {typeof currentStep.prompt === "function" ? currentStep.prompt(profile) : currentStep.prompt}
          </p>

          {/* Mobile hint */}
          {hasInfoPanel && !hoveredInfo && (
            <p className="mt-3 text-xs text-slate-400 italic lg:hidden">
              💡 Tap and hold any option to learn more about it
            </p>
          )}

          <div className="mt-8 min-h-64">
            {currentStep.render({ profile, updateProfile, toggleListValue, addCustomSkill, onHover: handleHover, onLeave: handleHoverLeave })}
          </div>

          {error ? <p className="mt-5 rounded-md bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300 font-semibold relative z-10">{error}</p> : null}

          <div className="mt-8 flex items-center justify-between gap-3 relative z-10">
            <button
              className="focus-ring rounded-md border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 transition"
              type="button"
              disabled={step === 0}
              onClick={() => { setStep((value) => value - 1); setHoveredInfo(null); }}
            >
              Back
            </button>
            <button
              className="focus-ring rounded-md bg-[#28b7a5] px-5 py-2 text-sm font-bold text-[#0b463b] hover:bg-[#39cbba] hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30 transition shadow-md shadow-[#28b7a5]/10 hover:shadow-[#28b7a5]/20"
              type="submit"
              disabled={!canContinue}
            >
              {step === steps.length - 1 ? "Build roadmap" : "Next"}
            </button>
          </div>
        </form>

        {/* ── Info Panel (Desktop) ── */}
        {hasInfoPanel && (
          <div className="info-panel-container hidden lg:block">
            <InfoPanel info={hoveredInfo} />
          </div>
        )}

        {/* ── Info Panel (Mobile — inline below form) ── */}
        {hasInfoPanel && hoveredInfo && (
          <div className="info-panel-mobile mt-4 lg:hidden">
            <InfoPanel info={hoveredInfo} />
          </div>
        )}
      </div>
    </main>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Info Panel Component
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function InfoPanel({ info }) {
  if (!info) {
    return (
      <div className="info-panel info-panel--empty">
        <div className="info-panel__placeholder">
          <span className="info-panel__placeholder-icon">💡</span>
          <p className="info-panel__placeholder-title">Hover over an option</p>
          <p className="info-panel__placeholder-subtitle">
            to see what it means and how it fits your career journey
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="info-panel info-panel--active" key={info.title}>
      <div className="info-panel__header">
        <span className="info-panel__icon">{info.icon}</span>
        <h3 className="info-panel__title">{info.title}</h3>
      </div>
      <p className="info-panel__brief">{info.brief}</p>
      <ul className="info-panel__bullets">
        {info.bullets.map((bullet, index) => (
          <li key={index} className="info-panel__bullet">
            <span className="info-panel__bullet-dot" />
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OptionGrid — now with hover tracking
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function OptionGrid({ options, selected, onSelect, hoverCategory, onHover, onLeave }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map(([value, label]) => (
        <button
          key={value}
          className={`focus-ring rounded-lg border px-4 py-4 text-left font-semibold transition ${
            selected === value
              ? "border-[#28b7a5] bg-[#28b7a5]/20 text-[#6ee7b7] shadow-[0_0_12px_rgba(40,183,165,0.25)]"
              : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
          }`}
          type="button"
          onClick={() => onSelect(value)}
          onMouseEnter={() => onHover?.(hoverCategory, value)}
          onMouseLeave={() => onLeave?.()}
          onTouchStart={() => onHover?.(hoverCategory, value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ChipGrid — now with hover tracking
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function ChipGrid({ options, selected, onToggle, hoverCategory, onHover, onLeave }) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            className={`focus-ring rounded-full border px-4 py-2 text-sm font-semibold transition ${
              isSelected
                ? "border-[#28b7a5] bg-[#28b7a5]/20 text-[#6ee7b7] shadow-[0_0_12px_rgba(40,183,165,0.25)]"
                : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
            }`}
            type="button"
            onClick={() => onToggle(option)}
            onMouseEnter={() => onHover?.(hoverCategory, option)}
            onMouseLeave={() => onLeave?.()}
            onTouchStart={() => onHover?.(hoverCategory, option)}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Helper Functions (unchanged)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function getSkillOptions(fieldType, selectedSkills, dynamicSkillsList) {
  const uniqueSkills = new Set([
    "None yet", 
    ...(fieldSkills[fieldType] ?? []), 
    ...(dynamicSkillsList || []),
    ...sharedSkills, 
    ...selectedSkills
  ]);
  return [...uniqueSkills];
}

function getGoalDetail(profile) {
  const fieldLabel = profile.field.type === "OTHER" ? profile.field.customValue || "your field" : profile.field.type.toLowerCase();
  const skillHint = profile.skills.filter((skill) => skill !== "None yet").slice(0, 2).join(" and ");
  const basedOnSkills = skillHint ? ` using ${skillHint}` : "";

  if (profile.goal.type === "STARTUP") {
    return {
      placeholder: "Example: An affordable study-planning app for students",
      suggestions: [
        `A ${fieldLabel} startup idea${basedOnSkills}`,
        "A student-focused service business",
        "A low-cost online education product",
        "A local community problem-solving venture",
      ],
    };
  }

  if (profile.goal.type === "HIGHER_STUDIES") {
    return {
      placeholder: "Example: B.Tech in Computer Science, MBA, M.Des, MSc Data Science",
      suggestions: [
        `Higher studies in ${fieldLabel}`,
        "A scholarship-friendly Indian college path",
        "A practical degree with internship options",
        "A postgraduate path connected to industry roles",
      ],
    };
  }

  return {
    placeholder: "Example: Data analyst, UX designer, lawyer, doctor, product manager",
    suggestions: [
      suggestJobRole(profile),
      `Entry-level ${fieldLabel} role`,
      "Internship-first career path",
      "Portfolio-based beginner role",
    ],
  };
}

function suggestJobRole(profile) {
  const fieldType = profile.field.type;
  const skillText = profile.skills.join(" ").toLowerCase();

  if (skillText.includes("python") || skillText.includes("excel") || skillText.includes("sql")) return "Data analyst";
  if (fieldType === "DESIGN") return "UX designer";
  if (fieldType === "LAW") return "Legal researcher";
  if (fieldType === "MEDICINE") return "Healthcare researcher";
  if (fieldType === "COMMERCE") return "Business analyst";
  if (fieldType === "SCIENCE") return "Research assistant";
  if (fieldType === "ARTS") return "Content strategist";
  return "Project coordinator";
}

function buildExploratoryGoal(profile) {
  return `Explore a practical job roadmap in ${profile.field.type === "OTHER" ? profile.field.customValue : profile.field.type.toLowerCase()} based on my current skills.`;
}
