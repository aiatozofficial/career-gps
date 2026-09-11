import React, { useState, useEffect } from "react";
import { fetchMarketIntel } from "../../services/resumeService";
import {
  saveMarketIntel,
  loadMarketIntel
} from "../../services/localStorageService";

export default function MarketIntelligence({ profile }) {
  const [intel, setIntel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [location, setLocation] = useState("India");

  const jobTitle = profile.goal?.description || "";
  const studyField = profile.field?.type || "General";

  // Bug #18 fix: define triggerFetch BEFORE the useEffect that calls it.
  // Using const (function expression) means it is NOT hoisted — referencing it
  // in a useEffect that appears earlier in source would cause a ReferenceError
  // under some bundler/strict-mode configurations.
  const triggerFetch = async () => {
    if (!jobTitle) {
      setError("Please ensure you have defined a career goal in onboarding first.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const data = await fetchMarketIntel(jobTitle, studyField, location);
      setIntel(data);
      saveMarketIntel(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load live market intelligence.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = loadMarketIntel();
    if (cached) {
      setIntel(cached);
    } else {
      // Auto-trigger load on mount if there's a goal.
      // Note: location is intentionally excluded from the dep array here —
      // location changes are handled by the manual "Refresh Report" button.
      triggerFetch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobTitle]);


  const getDemandColor = (level) => {
    switch (level?.toUpperCase()) {
      case "VERY_HIGH":
        return "text-[#28b7a5] bg-[#28b7a5]/10 border-[#28b7a5]/20";
      case "HIGH":
        return "text-[#8fd5c0] bg-[#8fd5c0]/10 border-[#8fd5c0]/20";
      case "MEDIUM":
        return "text-[#f7d06b] bg-[#f7d06b]/10 border-[#f7d06b]/20";
      case "LOW":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      default:
        return "text-slate-300 bg-white/5 border-white/10";
    }
  };

  const getDemandLabel = (level) => {
    switch (level?.toUpperCase()) {
      case "VERY_HIGH": return "Very High Demand";
      case "HIGH": return "High Demand";
      case "MEDIUM": return "Moderate Demand";
      case "LOW": return "Low/Developing Demand";
      default: return "Developing Demand";
    }
  };

  // Helper to check if student already possesses a trending skill
  const studentHasSkill = (skillName) => {
    const currentSkills = (profile.skills || []).map((s) => s.toLowerCase());
    return currentSkills.includes(skillName.toLowerCase());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Real-Time Job Market Intelligence</h2>
          <p className="text-slate-600 text-sm mt-1">
            Analyzing demand, salary ranges, trending skills, and live job options for: <strong className="text-amber-600 font-extrabold">{jobTitle || "Your Career Goal"}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Location, e.g. India"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#28b7a5] transition w-32 shadow-sm"
          />
          <button
            onClick={triggerFetch}
            disabled={loading}
            className="rounded-md bg-[#28b7a5] px-4 py-2 text-sm font-bold text-[#0b463b] hover:bg-[#39cbba] transition disabled:opacity-50 shadow"
          >
            {loading ? "Analyzing..." : "Refresh Report"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-sm text-slate-500 italic">
          Job market data is temporarily unavailable
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-20 text-center shadow-soft">
          <div className="flex h-12 w-12 items-center justify-center">
            <div className="h-8 w-8 rounded-full border-4 border-t-[#28b7a5] border-slate-100 animate-spin" />
          </div>
          <h3 className="mt-6 text-lg font-bold text-slate-800">Scanning Web Market Vectors</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-xs">
            Querying job search engines and aggregating localized recruitment data...
          </p>
        </div>
      )}

      {!loading && intel && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-fade-in">
          {/* Top Panel: Demand & Salary */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5 shadow-soft">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Hiring Velocity</span>
              <div className={`mt-2 flex items-center justify-center rounded-lg border py-2.5 font-extrabold ${getDemandColor(intel.demandLevel)}`}>
                {getDemandLabel(intel.demandLevel)}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Estimated Annual Salary</span>
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                <span className="text-xl font-black text-amber-600">{intel.avgSalary || "₹5,00,000 - ₹10,0,000"}</span>
                <p className="mt-1.5 text-xs text-slate-500">Based on junior to mid-level localized listings.</p>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Industry Outlook</span>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 font-medium">
                {intel.marketInsights || "The hiring trajectory remains steady, with specialized developers seeing the fastest growth."}
              </p>
            </div>
          </div>

          {/* Middle Panel: Trending Skills Map */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-soft">
            <div>
              <h3 className="text-lg font-bold text-slate-800 mb-3">Trending Skills In Demand</h3>
              <p className="text-xs text-slate-500 mb-4">
                Recruiters look for these modern skills. Double-check what you currently have:
              </p>
              <ul className="space-y-3">
                {(intel.trendingSkills || []).map((skill, idx) => {
                  const hasIt = studentHasSkill(skill);
                  return (
                    <li
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                    >
                      <span className="font-semibold text-slate-700">{skill}</span>
                      {hasIt ? (
                        <span className="rounded bg-[#28b7a5]/20 px-2 py-0.5 text-xs font-bold text-[#28b7a5]">
                          You have this ✓
                        </span>
                      ) : (
                        <span className="rounded bg-[#f7d06b]/20 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          Goal Roadmap
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-6 border-t border-slate-100 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Primary Hiring Ecosystems</h4>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(intel.topCompanies || []).map((co, idx) => (
                  <span
                    key={idx}
                    className="rounded bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs text-slate-600 font-bold"
                  >
                    {co}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Live Job Matches */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 md:col-span-2 lg:col-span-1 shadow-soft">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Live Opportunity Matches</h3>
            {intel.jobListings && intel.jobListings.length > 0 ? (
              <div className="space-y-3">
                {intel.jobListings.map((job, idx) => (
                  <a
                    key={idx}
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-slate-100 bg-slate-50 p-3 hover:border-slate-300 hover:bg-slate-100/50 transition group shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-slate-800 group-hover:text-[#28b7a5] transition truncate" title={job.title}>
                          {job.title}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5 truncate" title={job.company}>{job.company}</p>
                      </div>
                      <span className="text-xs font-bold text-amber-600 shrink-0 whitespace-nowrap">{job.salary || "Stipend"}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>{job.location || "Remote"}</span>
                      <span className="text-[#28b7a5] font-semibold group-hover:underline">Apply Now →</span>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-slate-500 text-sm bg-slate-50">
                No active listings found. Modify your target goal description to search again.
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !intel && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500">
          Click the "Refresh Report" button to analyze live job market opportunities.
        </div>
      )}
    </div>
  );
}
