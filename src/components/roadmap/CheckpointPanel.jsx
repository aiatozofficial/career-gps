import { useState } from "react";

export default function CheckpointPanel({ checkpointLabel, profile, checkpointData, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!checkpointData) {
    return (
      <div className="fixed right-0 top-0 h-full w-[420px] bg-slate-900 border-l border-slate-800 text-white p-6 shadow-2xl z-[90] flex flex-col justify-center items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-violet-500 mb-4"></div>
        <p className="text-sm text-slate-400">Loading Checkpoint Insights...</p>
      </div>
    );
  }

  const { narrative, skills_earned = [], certifications = [], internships = [], mini_resume = "" } = checkpointData;
  const careerGoal = profile?.goal?.description || "your career goal";

  const handleCopyResume = () => {
    navigator.clipboard.writeText(mini_resume);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80] transition-opacity duration-350"
        onClick={onClose}
      />

      {/* Slide-in container */}
      <div 
        className="fixed right-0 top-0 h-full w-full max-w-[500px] bg-slate-900 border-l border-slate-800 text-white p-6 shadow-2xl z-[90] flex flex-col transition-transform duration-300 ease-out transform translate-x-0"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <span className="text-xl">⭐</span>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-amber-400">{checkpointLabel}</h2>
              <p className="text-xs text-slate-400">Mid-Journey Milestone Check</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-6 custom-scrollbar">
          {/* Narrative */}
          <div className="bg-slate-800/40 rounded-xl p-5 border border-slate-800/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <span>📖</span> Progress Narrative
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {narrative}
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800/50">
              <span className="text-xs font-semibold text-slate-400">Skills Acquired</span>
              <div className="text-2xl font-bold text-violet-400 mt-1">{skills_earned.length}</div>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-800/50">
              <span className="text-xs font-semibold text-slate-400">Certifications</span>
              <div className="text-2xl font-bold text-amber-400 mt-1">{certifications.length}</div>
            </div>
          </div>

          {/* Earned Skills Chips */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              🛠️ Skills Built
            </h3>
            {skills_earned.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills_earned.map((s, idx) => (
                  <span 
                    key={idx} 
                    className="px-2.5 py-1 text-xs rounded-full bg-slate-800 border border-slate-700/80 text-slate-300 font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No skills listed yet.</p>
            )}
          </div>

          {/* Certs & Internships lists */}
          {certifications.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                🎓 Completed Certifications
              </h3>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                {certifications.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {internships.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                💼 Internships Attempted
              </h3>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4">
                {internships.map((i, idx) => (
                  <li key={idx}>{i}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Copyable Resume Block */}
          <div className="border-t border-slate-800 pt-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                📝 Mini Resume Snapshot
              </h3>
              <button
                onClick={handleCopyResume}
                className="px-2.5 py-1 rounded bg-violet-600 hover:bg-violet-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <span>{copied ? "✓ Copied!" : "📋 Copy"}</span>
              </button>
            </div>
            <pre className="bg-slate-950 rounded-xl p-4 text-xs font-mono border border-slate-850 text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {mini_resume}
            </pre>
          </div>
        </div>
      </div>
    </>
  );
}
