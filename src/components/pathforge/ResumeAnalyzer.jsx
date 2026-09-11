import React, { useState, useEffect } from "react";
import { uploadResume } from "../../services/resumeService";
import {
  saveResumeAnalysis,
  loadResumeAnalysis
} from "../../services/localStorageService";

export default function ResumeAnalyzer({ profile, onAnalysisComplete }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Loading messages rotation
  const loadingSteps = [
    "Reading PDF file...",
    "Extracting experience and education...",
    "Gemini parsing skills and comparing to target...",
    "Assembling gap analysis and recommendations...",
  ];

  useEffect(() => {
    const cached = loadResumeAnalysis();
    if (cached) {
      setAnalysis(cached);
    }
  }, []);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 2000);
    return () => clearInterval(interval);
  }, [loading]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        setError("");
      } else {
        setError("Please upload a PDF file only.");
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf") {
        setFile(selectedFile);
        setError("");
      } else {
        setError("Please upload a PDF file only.");
      }
    }
  };

  const startAnalysis = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setLoadingStep(0);

    try {
      const result = await uploadResume(file, profile);
      setAnalysis(result);
      saveResumeAnalysis(result);
      if (onAnalysisComplete) onAnalysisComplete(result);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to analyze resume. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetAnalyzer = () => {
    setFile(null);
    setAnalysis(null);
    setError("");
    saveResumeAnalysis(null);
    if (onAnalysisComplete) onAnalysisComplete(null);
  };

  // Calculate score based on skills match average or constant
  const calculateOverallMatch = () => {
    if (!analysis || !analysis.skills || analysis.skills.length === 0) return 70;
    const total = analysis.skills.reduce((acc, curr) => acc + (curr.match || 0), 0);
    return Math.round(total / analysis.skills.length);
  };

  const matchScore = calculateOverallMatch();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Resume Analyzer & Gap Matcher</h2>
          <p className="text-slate-600 text-sm mt-1">
            Upload your resume to extract skills, compare them with your target goal, and identify critical career gaps.
          </p>
        </div>
        {analysis && (
          <button
            onClick={resetAnalyzer}
            className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Reset & Upload Another
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-50 p-4 text-sm text-red-700 font-semibold">
          Error: {error}
        </div>
      )}

      {!analysis && !loading && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition ${
            dragActive
              ? "border-[#28b7a5] bg-[#28b7a5]/5"
              : "border-slate-200 bg-white hover:border-slate-300 shadow-soft"
          }`}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-[#28b7a5]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
          </div>

          <h3 className="mt-4 text-lg font-bold text-slate-800">Drag and drop your PDF resume</h3>
          <p className="mt-2 text-sm text-slate-500">or click below to browse your files</p>

          <label className="mt-6 cursor-pointer rounded-md bg-[#28b7a5] px-5 py-2.5 text-sm font-bold text-[#0b463b] hover:bg-[#39cbba] transition shadow-md">
            Select PDF
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          <p className="mt-3 text-xs text-slate-400">Supports PDF format up to 5MB</p>

          {file && (
            <div className="mt-8 w-full max-w-md rounded-lg border border-slate-200 bg-slate-50 p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <div className="text-left">
                  <p className="text-sm font-semibold truncate max-w-[200px] text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button
                onClick={startAnalysis}
                className="rounded-md bg-[#f7d06b] px-4 py-2 text-sm font-bold text-[#17202a] hover:bg-[#ffd978] transition shadow"
              >
                Analyze Now
              </button>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-20 text-center shadow-soft">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <div className="absolute h-full w-full rounded-full border-4 border-t-[#28b7a5] border-slate-100 animate-spin" />
            <svg className="w-8 h-8 text-[#28b7a5] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M21 12H3m18 3.75h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21M6.75 6.75h10.5a2.25 2.25 0 012.25 2.25v6.75a2.25 2.25 0 01-2.25 2.25H6.75a2.25 2.25 0 01-2.25-2.25V9a2.25 2.25 0 012.25-2.25z" />
            </svg>
          </div>
          <h3 className="mt-8 text-xl font-extrabold tracking-tight text-slate-800">AI Resume Engine Active</h3>
          <p className="mt-2 text-slate-500 text-sm max-w-sm h-6">
            {loadingSteps[loadingStep]}
          </p>
        </div>
      )}

      {analysis && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Section: Goal Match & Skills (Full Width) */}
          <div className="space-y-6">
            {/* Score & Match */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800">Goal Alignment Match</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Matching against target role: <strong className="text-amber-600 font-extrabold">{profile.goal?.description || "Career Goal"}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative flex h-20 w-20 items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="32" stroke="rgba(0,0,0,0.05)" strokeWidth="6" fill="transparent" />
                      <circle cx="40" cy="40" r="32" stroke={matchScore >= 80 ? "#28b7a5" : "#f7d06b"} strokeWidth="6" fill="transparent"
                        strokeDasharray={200}
                        strokeDashoffset={200 - (200 * matchScore) / 100}
                      />
                    </svg>
                    <span className="absolute text-lg font-black text-slate-800">{matchScore}%</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Match Grade</span>
                    <h4 className={`text-lg font-black ${matchScore >= 80 ? "text-[#28b7a5]" : "text-amber-600"}`}>
                      {matchScore >= 80 ? "Strong Fit" : matchScore >= 60 ? "Moderate Fit" : "Needs Growth"}
                    </h4>
                  </div>
                </div>
              </div>
            </div>

            {/* Extracted Skills */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
              <h3 className="text-lg font-extrabold text-slate-800 mb-4">Parsed Skills & Fit</h3>
              <div className="flex flex-wrap gap-2.5">
                {(analysis.skills || []).map((skill, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-sm"
                  >
                    <span className="font-bold text-slate-800">{skill.name}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                        skill.match >= 80
                          ? "bg-[#28b7a5]/20 text-[#28b7a5]"
                          : skill.match >= 50
                          ? "bg-[#f7d06b]/20 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {skill.match}% match
                    </span>
                  </div>
                ))}
                {(!analysis.skills || analysis.skills.length === 0) && (
                  <p className="text-slate-500 text-sm">No skills identified in this resume.</p>
                )}
              </div>
            </div>
          </div>

          {/* Middle Section: Experience & Education (2-Column Grid) */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Experience timeline */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
              <h3 className="text-lg font-extrabold text-slate-800 mb-4">Experience History</h3>
              {analysis.experience && analysis.experience.length > 0 ? (
                <div className="space-y-4">
                  {analysis.experience.map((exp, idx) => (
                    <div
                      key={idx}
                      className="relative border-l-2 border-slate-200 pl-5 ml-2.5 space-y-1"
                    >
                      <div className="absolute left-[-6px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#28b7a5]" />
                      <h4 className="font-extrabold text-slate-800">{exp.role}</h4>
                      <p className="text-sm text-slate-600 font-medium">
                        {exp.company} <span className="text-slate-300 mx-2">•</span> <span className="text-slate-500">{exp.duration}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No previous professional experience parsed.</p>
              )}
            </div>

            {/* Education Summary */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
              <h3 className="text-lg font-extrabold text-slate-800 mb-4">Education Details</h3>
              {analysis.education && analysis.education.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {analysis.education.map((edu, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-1"
                    >
                      <h4 className="font-bold text-amber-600">{edu.degree}</h4>
                      <p className="text-sm font-semibold text-slate-800">{edu.field}</p>
                      <p className="text-xs text-slate-500">{edu.school} {edu.year ? `(${edu.year})` : ""}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No academic credentials parsed.</p>
              )}
            </div>
          </div>

          {/* Bottom Section: Strengths, Gaps, and Recommendations (3-Column Grid) */}
          <div className="border-t border-slate-200 pt-6">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Strengths */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
                <h3 className="text-lg font-extrabold mb-4 text-emerald-800">Identified Strengths</h3>
                <ul className="space-y-3">
                  {(analysis.strengths || []).map((strength, idx) => (
                    <li key={idx} className="flex gap-2.5 text-sm leading-relaxed text-slate-700 font-medium">
                      <span className="text-[#28b7a5] font-extrabold">✓</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                  {(!analysis.strengths || analysis.strengths.length === 0) && (
                    <p className="text-slate-500 text-sm">No standout strengths detected in the resume text.</p>
                  )}
                </ul>
              </div>

              {/* Gaps */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
                <h3 className="text-lg font-extrabold mb-4 text-coral">Career Skill Gaps</h3>
                <ul className="space-y-3">
                  {(analysis.gaps || []).map((gap, idx) => (
                    <li key={idx} className="flex gap-2.5 text-sm leading-relaxed text-slate-700 font-medium">
                      <span className="text-red-500 font-extrabold">!</span>
                      <span>{gap}</span>
                    </li>
                  ))}
                  {(!analysis.gaps || analysis.gaps.length === 0) && (
                    <p className="text-slate-500 text-sm">Excellent! No major skill gaps detected compared to this goal.</p>
                  )}
                </ul>
              </div>

              {/* Recommendations */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
                <h3 className="text-lg font-extrabold mb-4 text-amber-600">Bridging Recommendations</h3>
                <ul className="space-y-3">
                  {(analysis.recommendations || []).map((rec, idx) => (
                    <li key={idx} className="flex gap-2.5 text-sm leading-relaxed text-slate-700 font-medium">
                      <span className="text-amber-500 font-extrabold">→</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                  {(!analysis.recommendations || analysis.recommendations.length === 0) && (
                    <p className="text-slate-500 text-sm">Follow your customized Career Roadmap milestones sequentially.</p>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
