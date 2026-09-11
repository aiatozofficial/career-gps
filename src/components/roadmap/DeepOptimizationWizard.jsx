import { useState, useEffect } from "react";

export default function DeepOptimizationWizard({ profile, roadmap, onComplete, onClose }) {
  const [loadingState, setLoadingState] = useState("fetching_questions"); // fetching_questions | answering | generating_roadmap | error
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch the dynamic questions on mount
  useEffect(() => {
    async function getQuestions() {
      try {
        const response = await fetch("/api/generate-deep-questions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ profile, roadmap }),
        });

        if (!response.ok) {
          throw new Error("Failed to contact the backend question server.");
        }

        const data = await response.json();
        if (!data.questions || !Array.isArray(data.questions) || data.questions.length < 3) {
          throw new Error("Invalid question structure returned by Gemini.");
        }

        setQuestions(data.questions);
        setLoadingState("answering");
      } catch (err) {
        console.error("Failed to load Phase 2 questions:", err);
        setErrorMessage(err.message || "An unexpected error occurred.");
        setLoadingState("error");
      }
    }

    getQuestions();
  }, [profile, roadmap]);

  const handleSelectOption = (optionText) => {
    const currentQuestion = questions[currentIdx];
    const newAnswer = {
      questionId: currentQuestion.id,
      questionText: currentQuestion.questionText,
      answerText: optionText,
    };

    const nextAnswers = [...answers, newAnswer];
    setAnswers(nextAnswers);

    if (currentIdx < questions.length - 1) {
      // Transition to next question with a micro-timeout for click feedback
      setTimeout(() => {
        setCurrentIdx(currentIdx + 1);
      }, 200);
    } else {
      // Finish answering, send to backend for deep roadmap compilation
      handleSubmitAnswers(nextAnswers);
    }
  };

  const handleSubmitAnswers = async (finalAnswers) => {
    setLoadingState("generating_roadmap");
    try {
      const response = await fetch("/api/generate-deep-roadmap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profile, roadmap, answers: finalAnswers }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate your deep roadmap.");
      }

      const deepData = await response.json();
      if (!deepData.weeklyStudyPlan || !deepData.targetProjects) {
        throw new Error("Invalid detailed data schema returned by Gemini.");
      }

      onComplete(deepData);
    } catch (err) {
      console.error("Failed to generate deep roadmap:", err);
      setErrorMessage(err.message || "Could not compile detailed study plans.");
      setLoadingState("error");
    }
  };

  if (loadingState === "fetching_questions") {
    return (
      <WizardOverlay onClose={onClose}>
        <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in">
          <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
            <div className="absolute h-full w-full animate-ping rounded-full bg-emerald-100 opacity-75" />
            <div className="absolute h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-emerald-500" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Phase 2 Analysis</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-800">Analyzing your roadmap...</h2>
          <p className="mt-3 max-w-sm text-sm text-slate-500 leading-relaxed">
            Gemini is compiling customized deep-dive questions based on your specific career profile to find where you can truly excel.
          </p>
        </div>
      </WizardOverlay>
    );
  }

  if (loadingState === "generating_roadmap") {
    return (
      <WizardOverlay onClose={onClose}>
        <div className="flex flex-col items-center justify-center p-8 text-center animate-fade-in">
          <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
            <div className="absolute h-full w-full animate-pulse rounded-full bg-gradient-to-tr from-emerald-400 to-ocean opacity-20" />
            <div className="absolute h-14 w-14 animate-spin rounded-full border-4 border-dashed border-emerald-500 border-t-transparent" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Deep Integration</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-800">Synthesizing blueprint...</h2>
          <p className="mt-3 max-w-sm text-sm text-slate-500 leading-relaxed">
            Google Gemini is now drafting your 6-week study schedule, specific portfolio projects, and specialized job strategies based on your onboarding answers!
          </p>
        </div>
      </WizardOverlay>
    );
  }

  if (loadingState === "error") {
    return (
      <WizardOverlay onClose={onClose}>
        <div className="p-8 text-center animate-fade-in">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-500 text-2xl">⚠️</span>
          <h2 className="mt-4 text-2xl font-bold text-slate-800">Generation Note</h2>
          <p className="mt-3 text-sm text-slate-600">{errorMessage}</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setLoadingState("fetching_questions");
                setErrorMessage("");
              }}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition active:scale-95 shadow-md"
            >
              Try Again
            </button>
          </div>
        </div>
      </WizardOverlay>
    );
  }

  const activeQuestion = questions[currentIdx];
  const progressPercent = Math.round(((currentIdx + 1) / questions.length) * 100);

  return (
    <WizardOverlay onClose={onClose}>
      <div className="animate-fade-in">
        {/* Progress header */}
        <div className="border-b border-slate-100 bg-slate-50/50 p-5 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600">Advanced Career Assessment</p>
              <h2 className="mt-1 text-sm font-bold text-slate-800">Question {currentIdx + 1} of {questions.length}</h2>
            </div>
            <span className="text-xs font-bold text-slate-500">{progressPercent}%</span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Question content */}
        <div className="p-6">
          <h3 className="text-[17px] font-bold text-slate-900 leading-snug">
            {activeQuestion.questionText}
          </h3>

          <div className="mt-6 grid gap-3">
            {activeQuestion.options.map((option, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectOption(option)}
                className="group relative flex w-full items-center rounded-lg border border-slate-200 bg-white p-4 text-left font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-soft active:scale-[0.99]"
              >
                <span className="mr-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-xs font-bold text-slate-500 transition group-hover:border-emerald-400 group-hover:bg-emerald-500 group-hover:text-white">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-[15px] font-semibold text-slate-700 transition group-hover:text-emerald-950">
                  {option}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </WizardOverlay>
  );
}

function WizardOverlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-xl border border-white/20 bg-white/95 shadow-2xl backdrop-blur-md">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition active:scale-90 z-10"
          title="Close questionnaire"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
