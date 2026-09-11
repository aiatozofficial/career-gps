import React, { useState, useMemo } from "react";

export default function SkillMap({ skillGap, profile, completedMilestones, resumeAnalysis }) {
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [filterCategory, setFilterCategory] = useState("all");

  const baseUserSkills = profile.skills.filter((s) => s !== "None yet");
  const earnedSkills = skillGap.need
    .filter((item) => completedMilestones.has(item.milestoneId))
    .map((item) => item.skill);
  
  // Combine all skills user has
  const masteredSkills = useMemo(() => {
    return Array.from(new Set([...baseUserSkills, ...earnedSkills]));
  }, [baseUserSkills, earnedSkills]);

  // Skills user still needs
  const remainingNeeds = useMemo(() => {
    return skillGap.need.filter((item) => !completedMilestones.has(item.milestoneId));
  }, [skillGap.need, completedMilestones]);

  // Map of mock recommendations for skills
  const skillDetails = {
    // Technical
    python: {
      category: "Technical",
      difficulty: "Medium",
      resources: "NPTEL 'Joy of Computing using Python' / Coursera",
      project: "Build a command-line automated file organizer that sorts documents.",
      timeToLearn: "4-6 Weeks"
    },
    javascript: {
      category: "Technical",
      difficulty: "Medium",
      resources: "freeCodeCamp / MDN Web Docs",
      project: "Create an interactive dashboard rendering real-time local weather stats.",
      timeToLearn: "4-5 Weeks"
    },
    sql: {
      category: "Technical",
      difficulty: "Easy",
      resources: "Khan Academy / W3Schools SQL Tutorials",
      project: "Design a relational database schema for a student enrollment tracker.",
      timeToLearn: "2-3 Weeks"
    },
    excel: {
      category: "Technical",
      difficulty: "Easy",
      resources: "Microsoft Learn / YouTube Excel Playlists",
      project: "Build a comprehensive personal budget tracker with pivot tables.",
      timeToLearn: "1-2 Weeks"
    },
    figma: {
      category: "Technical",
      difficulty: "Easy",
      resources: "Figma Academy / DesignTheory tutorials",
      project: "Design a high-fidelity mobile landing page prototype for a local vendor.",
      timeToLearn: "2-3 Weeks"
    },
    "problem solving": {
      category: "Technical",
      difficulty: "Hard",
      resources: "HackerRank / LeetCode (Easy/Medium problems)",
      project: "Implement 15 core sorting and searching algorithms in code.",
      timeToLearn: "Ongoing"
    },
    git: {
      category: "Technical",
      difficulty: "Easy",
      resources: "GitHub Learning Lab / Git Immersion",
      project: "Initialize a local project, make 5 branches, merge, and resolve conflicts.",
      timeToLearn: "1 Week"
    },
    // Shared / Soft
    communication: {
      category: "Soft Skill",
      difficulty: "Medium",
      resources: "Toastmasters International online guides / Swayam",
      project: "Record a 5-minute video pitch explaining your target career goal.",
      timeToLearn: "Ongoing"
    },
    teamwork: {
      category: "Soft Skill",
      difficulty: "Easy",
      resources: "Coursera 'High Performance Collaboration'",
      project: "Initiate or lead a local group study session or a 2-day hackathon team.",
      timeToLearn: "Ongoing"
    },
    research: {
      category: "Soft Skill",
      difficulty: "Medium",
      resources: "University research guides / Google Scholar",
      project: "Write a 2-page executive summary on a trending tech topic in your field.",
      timeToLearn: "2 Weeks"
    },
    "public speaking": {
      category: "Soft Skill",
      difficulty: "Hard",
      resources: "TED Talks coaching series / Local debates",
      project: "Deliver a 10-minute presentation at a school, college, or community event.",
      timeToLearn: "4 Weeks"
    },
    presentation: {
      category: "Soft Skill",
      difficulty: "Easy",
      resources: "Canva Design School / PowerPoint masterclasses",
      project: "Build a slide deck of 10 slides summarizing your portfolio projects.",
      timeToLearn: "1-2 Weeks"
    }
  };

  const getSkillMeta = (skillName) => {
    const key = skillName.toLowerCase().trim();
    if (skillDetails[key]) return skillDetails[key];
    
    // Fallback dynamic generator
    const isShared = ["documentation", "communication", "research", "teamwork", "public speaking", "presentation"].includes(key);
    return {
      category: isShared ? "Soft Skill" : "Technical",
      difficulty: "Medium",
      resources: "Google Search & Swayam/NPTEL online portals",
      project: `Build a brief mini-project showcasing your mastery in ${skillName}.`,
      timeToLearn: "3-4 Weeks"
    };
  };

  // Compile all skills to display in skill map, integrating resume analysis
  const allSkills = useMemo(() => {
    const resumeSkillsMap = {};
    const resumeGaps = new Set();
    
    if (resumeAnalysis) {
      if (resumeAnalysis.skills) {
        resumeAnalysis.skills.forEach(s => {
          resumeSkillsMap[s.name.toLowerCase().trim()] = s.match;
        });
      }
      if (resumeAnalysis.gaps) {
        resumeAnalysis.gaps.forEach(g => {
          resumeGaps.add(g.toLowerCase().trim());
        });
      }
    }

    const masteredList = masteredSkills.map((s) => {
      const key = s.toLowerCase().trim();
      let currentLevel = 85;
      let isResumeStrength = false;
      
      if (resumeSkillsMap[key] !== undefined) {
        currentLevel = resumeSkillsMap[key];
        isResumeStrength = currentLevel >= 75;
      }

      return {
        name: s,
        status: "mastered",
        currentLevel,
        targetLevel: 95,
        isResumeStrength,
        isResumeGap: false,
        meta: getSkillMeta(s)
      };
    });

    const neededList = remainingNeeds.map((item) => {
      const key = item.skill.toLowerCase().trim();
      let currentLevel = 25;
      let isResumeGap = resumeGaps.has(key);
      
      if (resumeSkillsMap[key] !== undefined) {
        currentLevel = resumeSkillsMap[key];
        if (currentLevel < 60) {
          isResumeGap = true;
        }
      } else if (isResumeGap) {
        currentLevel = 15;
      }

      return {
        name: item.skill,
        status: "needed",
        currentLevel,
        targetLevel: 85,
        isResumeStrength: false,
        isResumeGap,
        meta: getSkillMeta(item.skill)
      };
    });

    // Discover extra skills from resume that aren't in main goals
    const existingSkillKeys = new Set([
      ...masteredSkills.map(s => s.toLowerCase().trim()),
      ...remainingNeeds.map(item => item.skill.toLowerCase().trim())
    ]);

    const discoveredList = [];
    if (resumeAnalysis && resumeAnalysis.skills) {
      resumeAnalysis.skills.forEach(s => {
        const key = s.name.toLowerCase().trim();
        if (!existingSkillKeys.has(key)) {
          discoveredList.push({
            name: s.name,
            status: "mastered",
            currentLevel: s.match,
            targetLevel: 90,
            isResumeStrength: s.match >= 75,
            isResumeGap: false,
            isDiscovered: true,
            meta: getSkillMeta(s.name)
          });
        }
      });
    }

    return [...masteredList, ...neededList, ...discoveredList];
  }, [masteredSkills, remainingNeeds, resumeAnalysis]);

  // Filter skills list
  const filteredSkills = useMemo(() => {
    if (filterCategory === "all") return allSkills;
    if (filterCategory === "mastered") return allSkills.filter((s) => s.status === "mastered");
    if (filterCategory === "needed") return allSkills.filter((s) => s.status === "needed");
    return allSkills.filter((s) => s.meta.category.toLowerCase().includes(filterCategory));
  }, [allSkills, filterCategory]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">Dynamic Skill Gap Map</h2>
          <p className="text-slate-600 text-sm mt-1">
            Visualizing your current skill levels, target levels, and direct pathways to bridge critical career gaps.
          </p>
        </div>
        
        {/* Category Toggles */}
        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-lg self-start sm:self-center">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
              filterCategory === "all" ? "bg-white text-ink shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterCategory("mastered")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
              filterCategory === "mastered" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Mastered
          </button>
          <button
            onClick={() => setFilterCategory("needed")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
              filterCategory === "needed" ? "bg-amber-500 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Gaps
          </button>
          <button
            onClick={() => setFilterCategory("technical")}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
              filterCategory === "technical" ? "bg-ocean text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Technical
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Skills Grid */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          {filteredSkills.map((skill) => {
            const isMastered = skill.status === "mastered";
            return (
              <div
                key={skill.name}
                onClick={() => setSelectedSkill(skill)}
                className={`cursor-pointer rounded-xl border p-4 transition-all duration-300 relative group flex flex-col justify-between ${
                  selectedSkill?.name === skill.name
                    ? "border-cyan-500 bg-cyan-50/20 shadow-md scale-[1.02]"
                    : isMastered
                    ? "border-emerald-200 bg-emerald-50/10 hover:border-emerald-300 hover:bg-emerald-50/30"
                    : "border-amber-200 bg-amber-50/10 hover:border-amber-300 hover:bg-amber-50/30"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${
                      skill.meta.category === "Soft Skill" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {skill.meta.category}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                      skill.isResumeGap
                        ? "bg-rose-100 text-rose-800 animate-pulse"
                        : skill.isDiscovered
                        ? "bg-cyan-100 text-cyan-800 border border-cyan-300"
                        : isMastered
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {skill.isResumeGap ? "Resume Gap" : skill.isDiscovered ? "Resume Skill" : isMastered ? "Mastered" : "Gap"}
                    </span>
                  </div>

                  <h3 className="mt-3 font-extrabold text-base text-slate-800 group-hover:text-cyan-700 transition">
                    {skill.name}
                  </h3>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100/80 space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>Proficiency</span>
                    <span>{skill.currentLevel}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        skill.isResumeGap ? "bg-rose-400" : isMastered ? "bg-emerald-500" : "bg-amber-400"
                      }`}
                      style={{ width: `${skill.currentLevel}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 text-right">Target: {skill.targetLevel}%</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Detail Panel */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between min-h-[300px]">
          {selectedSkill ? (
            <div className="space-y-4 animate-fade-in">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-800">
                Skill Pathway
              </span>
              <h3 className="text-xl font-black text-slate-900">{selectedSkill.name}</h3>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg text-xs">
                <div>
                  <span className="font-semibold text-slate-400 block uppercase">Type</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{selectedSkill.meta.category}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block uppercase">Difficulty</span>
                  <span className={`font-bold mt-0.5 block ${
                    selectedSkill.meta.difficulty === "Hard" ? "text-red-500" : "text-emerald-700"
                  }`}>{selectedSkill.meta.difficulty}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block uppercase">Learning Curve</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{selectedSkill.meta.timeToLearn}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 block uppercase">Status</span>
                  <span className={`font-bold mt-0.5 block ${
                    selectedSkill.status === "mastered" ? "text-emerald-600" : "text-amber-500"
                  }`}>{selectedSkill.status === "mastered" ? "Mastered" : "Bridge Needed"}</span>
                </div>
              </div>

              {selectedSkill.isResumeGap && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-[11px] text-rose-950 leading-relaxed shadow-sm">
                  <span className="font-extrabold block">Resume Gap Alert</span>
                  This skill was identified as a critical gap in your resume analyzer. Prioritize building the project blueprint below to prove competence.
                </div>
              )}

              {selectedSkill.isResumeStrength && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-[11px] text-emerald-950 leading-relaxed shadow-sm">
                  <span className="font-extrabold block">High Fit Strength</span>
                  Awesome! Your resume demonstrates solid experience or familiarity with this skill. Highlight this strength in your portfolio.
                </div>
              )}

              {selectedSkill.isDiscovered && (
                <div className="rounded-lg bg-cyan-50 border border-cyan-200 p-3 text-[11px] text-cyan-950 leading-relaxed shadow-sm">
                  <span className="font-extrabold block">Extracted Resume Skill</span>
                  This skill was automatically extracted from your resume. We've added it to your map to keep track of your full capabilities.
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Top Recommended Resource</h4>
                <p className="mt-1 text-sm font-semibold text-slate-800 leading-relaxed">
                  Resource: {selectedSkill.meta.resources}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Proof-of-work project idea</h4>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 border-l-2 border-[#28b7a5] pl-2.5">
                  {selectedSkill.meta.project}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 my-auto text-slate-400 space-y-4">
              <svg className="w-12 h-12 text-slate-300 animate-gentle-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.446l-6.002-3.001a1.125 1.125 0 00-1.006-.003l-5.385 2.692a.75.75 0 01-1.083-.67V6.112c0-.325.21-.614.512-.733l5.24-2.096a1.125 1.125 0 011.006.003l6.002 3.001a1.125 1.125 0 001.006.003l5.385-2.692a.75.75 0 011.083.67v12.518a.75.75 0 01-.512.733l-5.24 2.096a1.125 1.125 0 01-1.006-.003z" />
              </svg>
              <p className="text-sm font-bold">Select a skill node from the map to view detailed learning pathways, curated resources, and portfolio project blueprints.</p>
            </div>
          )}

          {selectedSkill && (
            <button
              onClick={() => setSelectedSkill(null)}
              className="mt-6 w-full rounded-md border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            >
              Clear Selection
            </button>
          )}
        </div>
      </div>

      {/* Bridging Steps Panel */}
      <div className="rounded-xl border border-slate-200 bg-[#fff8f4] p-6 shadow-sm border-l-4 border-l-coral mt-6">
        <div className="flex items-center gap-3 border-b border-coral/15 pb-4 mb-4">
          <svg className="w-6 h-6 text-coral shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.61 8.41a6 6 0 013.43 3.38m2.55 2.58l-2.55-2.58m0 0A6 6 0 112 12a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.61 8.41" />
          </svg>
          <div>
            <h3 className="text-lg font-bold text-coral-950">Bridging Roadmap Milestones</h3>
            <p className="text-xs text-slate-600">Immediate action items synthesized to close your current skill gaps.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {skillGap.bridgingSteps.map((step, idx) => (
            <div key={idx} className="flex gap-3 rounded-lg border border-slate-200/50 bg-white p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-coral text-xs font-extrabold text-white">
                {idx + 1}
              </span>
              <span className="text-sm font-bold text-ink leading-snug">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
