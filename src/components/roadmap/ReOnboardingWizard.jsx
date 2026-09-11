import { useState, useMemo } from "react";
import { inferCollegeDegree, getSuggestionsForGoal, checkCourseMatch, checkStreamMatch } from "../../utils/roadmapHelpers";

export default function ReOnboardingWizard({ profile, phase, onComplete, onClose }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  // Re-onboarding survey states
  const [goalType, setGoalType] = useState(profile.goal?.type || "JOB_ROLE");
  const [goalDesc, setGoalDesc] = useState(profile.goal?.description || "");
  
  // Phase 1 -> Phase 2 selections
  const [tenthPath, setTenthPath] = useState("CBSE");
  const [streamElectives, setStreamElectives] = useState("MPC");
  const [prepStyle, setPrepStyle] = useState("Self-study");
  const [academicFocus, setAcademicFocus] = useState("Balanced");

  // Phase 2 -> Phase 3 selections
  const [enableLongTerm, setEnableLongTerm] = useState(true);
  const [hasCourseInMind, setHasCourseInMind] = useState(null); // null, 'YES', 'NO'
  const [courseInput, setCourseInput] = useState(() => {
    if (profile.collegeDegree && profile.collegeDegree.trim()) {
      return profile.collegeDegree;
    }
    return "";
  });
  const [collegeDegree, setCollegeDegree] = useState(() => {
    if (profile.collegeDegree && profile.collegeDegree.trim()) {
      return profile.collegeDegree;
    }
    return "";
  });
  const [collegeEnvironment, setCollegeEnvironment] = useState("Regional College");
  const [collegeFocus, setCollegeFocus] = useState("Campus Placements");
  const [timeCommitment, setTimeCommitment] = useState("Balanced");
  const [overrideStreamWarning, setOverrideStreamWarning] = useState(false);
  const [postCollegeChoice, setPostCollegeChoice] = useState("JUNIOR_ROLE");
  const [targetLeadershipGoal, setTargetLeadershipGoal] = useState("SENIOR");
  const [collegeTier, setCollegeTier] = useState("TIER_1");
  const [postGradCourse, setPostGradCourse] = useState("");

  const stepsPhase1 = useMemo(() => {
    const list = [
      {
        title: "Has your career goal changed?",
        prompt: "Adjust your target direction or explain what you want to achieve.",
        render: () => (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Goal Category</label>
              <select
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean"
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
              >
                <option value="JOB_ROLE">Job role / Professional position</option>
                <option value="STARTUP">Entrepreneurship</option>
                <option value="HIGHER_STUDIES">Higher studies / Research</option>
                <option value="NOT_SURE">Not sure yet</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Description</label>
              <textarea
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean text-sm h-28"
                value={goalDesc}
                placeholder="e.g. Become a software engineer, or start your own business..."
                onChange={(e) => setGoalDesc(e.target.value)}
              />
            </div>
          </div>
        ),
        validate: () => goalDesc.trim().length > 0 ? "" : "Please describe your career goal."
      },
      {
        title: "What does the user want to do next?",
        prompt: "Select the track you plan to pursue after Class 10.",
        render: () => (
          <div className="grid gap-3">
            {[
              ["CBSE", "CBSE (11th & 12th Grade)", "Central board education focusing on core sciences, commerce, or arts."],
              ["INTER", "Intermediate College (Board of Inter)", "Focus on state board curriculum and intensive entrance prep."],
              ["DIPLOMA", "Polytechnic Diploma (3 Years)", "Practical technical stream. Direct direct entry to engineering later."]
            ].map(([val, title, desc]) => (
              <button
                key={val}
                type="button"
                onClick={() => setTenthPath(val)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  tenthPath === val
                    ? "border-emerald-500 bg-emerald-500/10 text-white"
                    : "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <h4 className="font-bold text-[15px]">{title}</h4>
                <p className="text-xs text-slate-400 mt-1">{desc}</p>
              </button>
            ))}
          </div>
        ),
        validate: () => ""
      },
      {
        title: "Select your target stream electives / branch of study:",
        prompt: "This customizes the subjects and tools Gemini will schedule in your roadmap.",
        render: () => {
          const isDiploma = tenthPath === "DIPLOMA";
          const options = isDiploma
            ? [
                ["Computer Engineering", "Computer Science, IT, Programming labs"],
                ["Electronics & Communication", "Circuits, Hardware systems, Signal labs"],
                ["Mechanical Engineering", "Machines, Mechanics, Drafting labs"],
                ["Civil / Chemical Engineering", "Structural design, Biotech, Chemical labs"]
              ]
            : [
                ["MPC", "Maths, Physics, Chemistry (Engineering/Sciences)"],
                ["BiPC", "Biology, Physics, Chemistry (Medicine/Life Sciences)"],
                ["MEC / CEC", "Maths/Civics, Economics, Commerce (Business/Finance)"],
                ["HEC / Humanities", "History, Economics, Civics (Law/Arts)"]
              ];
          return (
            <div className="grid gap-3">
              {options.map(([val, desc]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setStreamElectives(val);
                    setOverrideStreamWarning(false);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                    streamElectives === val
                      ? "border-emerald-500 bg-emerald-500/10 text-white"
                      : "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <h4 className="font-bold text-[15px]">{val}</h4>
                  <p className="text-xs text-slate-400 mt-1">{desc}</p>
                </button>
              ))}
            </div>
          );
        },
        validate: () => ""
      }
    ];

    // Interlace course alignment validation
    const streamCheck = checkStreamMatch(streamElectives, goalDesc, profile.field?.type || goalType);
    if (!overrideStreamWarning && !streamCheck.matches) {
      const isDiploma = tenthPath === "DIPLOMA";
      const suggestions = isDiploma
        ? ["Computer Engineering", "Electronics & Communication"]
        : ["MPC", "MEC / CEC", "HEC / Humanities"];

      list.push({
        title: "Are you sure this is the right stream?",
        prompt: `You aim to become a "${goalDesc}", but selected "${streamElectives}". This might not be the most direct path.`,
        render: () => (
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
              <p className="text-xs text-amber-200 leading-relaxed font-semibold text-center">
                ⚠️ {streamCheck.reason}
              </p>
            </div>
            
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-4">We suggest choosing one of these streams instead:</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  className={`rounded-xl border p-4 text-left text-xs font-extrabold transition duration-200 ${
                    streamElectives === suggestion ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600"
                  }`}
                  type="button"
                  onClick={() => {
                    setStreamElectives(suggestion);
                  }}
                >
                  🌟 Switch to {suggestion}
                </button>
              ))}
            </div>

            <div className="flex justify-center border-t border-slate-800 pt-4 mt-2">
              <button
                className="px-4 py-2.5 rounded-lg text-xs font-bold border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition duration-200"
                type="button"
                onClick={() => setOverrideStreamWarning(true)}
              >
                Proceed Anyway (Keep "{streamElectives}")
              </button>
            </div>
          </div>
        ),
        validate: () => ""
      });
    }

    list.push(
      {
        title: "How do you prefer to prepare for entrances?",
        prompt: "Customizes preparation tactics for exams like JEE, NEET, EAMCET, etc.",
        render: () => (
          <div className="grid gap-3">
            {[
              ["Self-study", "Self-study using free online platforms", "Using free online lectures (NPTEL, SWAYAM, YouTube) and standard textbooks."],
              ["Local tuition", "Local tuition / coaching classes", "Attending regular evening coaching classes near home."],
              ["Integrated coaching", "Integrated junior college coaching program", "Enrolled in a fully integrated board + competitive coaching program."]
            ].map(([val, title, desc]) => (
              <button
                key={val}
                type="button"
                onClick={() => setPrepStyle(val)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  prepStyle === val
                    ? "border-emerald-500 bg-emerald-500/10 text-white"
                    : "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <h4 className="font-bold text-[15px]">{title}</h4>
                <p className="text-xs text-slate-400 mt-1">{desc}</p>
              </button>
            ))}
          </div>
        ),
        validate: () => ""
      },
      {
        title: "What is your main academic focus?",
        prompt: "Balances study intensity with sports and early skill exploration.",
        render: () => (
          <div className="grid gap-3">
            {[
              ["Board Exams Only", "Maximize Board Exam Percentage", "Focus completely on clearing school boards with a high percentage."],
              ["Entrance Competitive", "Top Competitive Entrance Rank", "Maximize scores in competitive tests to enter top tier universities."],
              ["Balanced", "Academic-Skill Balance", "Excel in standard academics while spending 2 hours/week building early coding/field projects."]
            ].map(([val, title, desc]) => (
              <button
                key={val}
                type="button"
                onClick={() => setAcademicFocus(val)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  academicFocus === val
                    ? "border-emerald-500 bg-emerald-500/10 text-white"
                    : "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <h4 className="font-bold text-[15px]">{title}</h4>
                <p className="text-xs text-slate-400 mt-1">{desc}</p>
              </button>
            ))}
          </div>
        ),
        validate: () => ""
      }
    );

    return list;
  }, [goalType, goalDesc, tenthPath, streamElectives, prepStyle, academicFocus, overrideStreamWarning, profile.field?.type]);

  const stepsPhase2 = useMemo(() => {
    const list = [
      {
        title: "Has your career goal changed?",
        prompt: "Adjust your career goal or explain what role you are targeting now.",
        render: () => (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Goal Category</label>
              <select
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean"
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
              >
                <option value="JOB_ROLE">Job role / Professional position</option>
                <option value="STARTUP">Entrepreneurship</option>
                <option value="HIGHER_STUDIES">Higher studies / Research</option>
                <option value="NOT_SURE">Not sure yet</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Description</label>
              <textarea
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean text-sm h-28"
                value={goalDesc}
                placeholder="e.g. Become a software engineer, or start your own business..."
                onChange={(e) => setGoalDesc(e.target.value)}
              />
            </div>
          </div>
        ),
        validate: () => goalDesc.trim().length > 0 ? "" : "Please describe your career goal."
      },
      {
        title: "Do you want to enable the long-term career path?",
        prompt: "You can choose to focus strictly on college, or extend the roadmap to cover your first junior/senior job ladder.",
        render: () => (
          <div className="grid gap-3">
            {[
              [true, "Yes, enable long-term path", "Show college years 1-4 followed by junior, mid-level, and senior professional progression (recommended)."],
              [false, "No, show college path only", "Limit the milestones strictly to your 4 years of college graduation studies."]
            ].map(([val, title, desc]) => (
              <button
                key={val.toString()}
                type="button"
                onClick={() => setEnableLongTerm(val)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  enableLongTerm === val
                    ? "border-emerald-500 bg-emerald-500/10 text-white"
                    : "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <h4 className="font-bold text-[15px]">{title}</h4>
                <p className="text-xs text-slate-400 mt-1">{desc}</p>
              </button>
            ))}
          </div>
        ),
        validate: () => ""
      }
    ];

    list.push({
      title: "Do you have a specific college course in mind?",
      prompt: "Choose if you are already enrolled or have a specific major in mind.",
      render: () => (
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            className={`rounded-xl border p-5 text-left transition duration-200 ${
              hasCourseInMind === "YES" ? "border-ocean bg-ocean/10 text-white" : "border-slate-700 bg-slate-800/40 hover:border-slate-600 text-slate-300"
            }`}
            type="button"
            onClick={() => {
              setHasCourseInMind("YES");
              setCollegeDegree("");
            }}
          >
            <span className="text-base font-bold block mb-1">✍️ Yes, I have a course in mind</span>
            <span className="text-xs text-slate-400 font-normal">I will enter the specific degree I plan to study.</span>
          </button>
          <button
            className={`rounded-xl border p-5 text-left transition duration-200 ${
              hasCourseInMind === "NO" ? "border-ocean bg-ocean/10 text-white" : "border-slate-700 bg-slate-800/40 hover:border-slate-600 text-slate-300"
            }`}
            type="button"
            onClick={() => {
              setHasCourseInMind("NO");
              const suggested = inferCollegeDegree({
                ...profile,
                goal: { ...profile.goal, description: goalDesc || "" }
              });
              setCollegeDegree(suggested);
            }}
          >
            <span className="text-base font-bold block mb-1">💡 No, suggest a course for me</span>
            <span className="text-xs text-slate-400 font-normal">Suggest the best-fit course based on my goal.</span>
          </button>
        </div>
      ),
      validate: () => hasCourseInMind !== null ? "" : "Please select whether you have a course in mind."
    });

    if (hasCourseInMind === "NO") {
      const suggestedDegree = collegeDegree || inferCollegeDegree({
        ...profile,
        goal: { ...profile.goal, description: goalDesc || "" }
      });
      list.push({
        title: "We've got you covered!",
        prompt: "No worries! We've recommended the perfect educational path for your career goals.",
        render: () => (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
            <span className="text-4xl block mb-3">🎓</span>
            <h3 className="text-lg font-bold text-emerald-400">Recommended Academic Major</h3>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              To achieve your goal of becoming a <strong className="text-emerald-300">"{goalDesc || 'your goal'}"</strong>, we recommend pursuing:
            </p>
            <div className="mt-4 p-4 rounded-lg bg-slate-800 border border-emerald-500/30 inline-block shadow-lg">
              <span className="text-xl font-black text-emerald-300">{suggestedDegree}</span>
            </div>
            <p className="mt-4 text-[10px] text-slate-400 leading-relaxed">
              All semesters, dynamic certifications, and internships will align to this major. Click Continue to proceed.
            </p>
          </div>
        ),
        validate: () => ""
      });
    }

    if (hasCourseInMind === "YES") {
      list.push({
        title: "What degree course are you pursuing?",
        prompt: "This customizes the academic focus during your college years.",
        render: () => (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Degree Name & Stream</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean"
                value={courseInput}
                placeholder="e.g. Bachelor's in Culinary Arts, B.Tech CSE, B.Com..."
                onChange={(e) => {
                  setCourseInput(e.target.value);
                  setCollegeDegree(e.target.value);
                }}
              />
            </div>
            <p className="text-[10px] text-slate-400 italic">
              💡 Examples: Bachelor's in Culinary Arts, B.Tech CS, B.Des, B.Com Honors...
            </p>
          </div>
        ),
        validate: () => courseInput.trim().length > 0 ? "" : "Please enter your degree name."
      });

      const isMatched = checkCourseMatch(courseInput, goalDesc, profile.field?.type);
      if (!isMatched) {
        const suggestions = getSuggestionsForGoal(goalDesc, profile.field?.type);
        list.push({
          title: "Are you sure this is the right course?",
          prompt: `You aim to become a "${goalDesc}", but are studying "${courseInput}". This might not be the most direct path.`,
          render: () => (
            <div className="space-y-4">
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                <p className="text-[11px] text-amber-200">
                  ⚠️ Mismatch warning: Placements or licenses for your target role might require a different curriculum.
                </p>
              </div>
              
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">We suggest taking one of these courses instead:</h4>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    className={`rounded-lg border p-3.5 text-left text-xs font-extrabold transition duration-200 ${
                      collegeDegree === suggestion ? "border-emerald-500 bg-emerald-500/10 text-emerald-300" : "border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600"
                    }`}
                    type="button"
                    onClick={() => {
                      setCourseInput(suggestion);
                      setCollegeDegree(suggestion);
                    }}
                  >
                    🌟 {suggestion}
                  </button>
                ))}
              </div>

              <div className="flex justify-center border-t border-slate-800 pt-3.5">
                <button
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold border transition duration-200 ${
                    collegeDegree === courseInput ? "bg-slate-800 border-slate-600 text-white" : "border-slate-700 text-slate-400 hover:bg-slate-800"
                  }`}
                  type="button"
                  onClick={() => setCollegeDegree(courseInput)}
                >
                  No, I want to stick to my original choice: "{courseInput}"
                </button>
              </div>
            </div>
          ),
          validate: () => collegeDegree.trim().length > 0 ? "" : "Please select or enter your degree name."
        });
      }
    }

    list.push(
      {
        title: "What type of college environment are you in?",
        prompt: "Helps tailor project and learning requirements realistically.",
        render: () => (
          <div className="grid gap-3">
            {[
              ["Tier 1 National", "Tier 1 National Institution", "IIT, NIT, IIIT, BITS, national law universities, or premier central campuses."],
              ["Regional College", "Tier 2/3 Regional University / College", "Affiliated engineering/commerce colleges with regional placement structures."],
              ["Online / Distance", "Distance / Online Degree Program", "Studying remotely or doing a double degree program online."]
            ].map(([val, title, desc]) => (
              <button
                key={val}
                type="button"
                onClick={() => setCollegeEnvironment(val)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  collegeEnvironment === val
                    ? "border-emerald-500 bg-emerald-500/10 text-white"
                    : "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <h4 className="font-bold text-[15px]">{title}</h4>
                <p className="text-xs text-slate-400 mt-1">{desc}</p>
              </button>
            ))}
          </div>
        ),
        validate: () => ""
      },
      {
        title: "What is your primary focus for college?",
        prompt: "Dynamic certifications and career preparation will align with this objective from Year 2 onwards.",
        render: () => (
          <div className="grid gap-3">
            {[
              ["Campus Placements", "Campus Placement Drives", "Sit for campus recruiters, preparing core mock interviews and resumes."],
              ["Off-Campus & Startups", "Off-Campus Jobs & Startups", "Targeting direct operator job openings, freelance work, or building a startup."],
              ["Master's studies", "Prepare for Postgraduate Studies", "Focus heavily on academic credits, research papers, and clearing GATE/CAT/GRE."]
            ].map(([val, title, desc]) => (
              <button
                key={val}
                type="button"
                onClick={() => setCollegeFocus(val)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  collegeFocus === val
                    ? "border-emerald-500 bg-emerald-500/10 text-white"
                    : "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <h4 className="font-bold text-[15px]">{title}</h4>
                <p className="text-xs text-slate-400 mt-1">{desc}</p>
              </button>
            ))}
          </div>
        ),
        validate: () => ""
      },
      {
        title: "How much spare time can you dedicate?",
        prompt: "Adjusts the density of external projects and certifications scheduled from Year 2 onwards.",
        render: () => (
          <div className="grid gap-3">
            {[
              ["Light", "Light Commitment (2-4 hours/week)", "Focus heavily on college CGPA, keeping external certifications low."],
              ["Balanced", "Balanced Commitment (5-10 hours/week)", "Blend university studies with weekly coding, projects, and certifications."],
              ["Intensive", "Intensive Commitment (12+ hours/week)", "Highly accelerated timeline targeting top internships and open-source contributions."]
            ].map(([val, title, desc]) => (
              <button
                key={val}
                type="button"
                onClick={() => setTimeCommitment(val)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  timeCommitment === val
                    ? "border-emerald-500 bg-emerald-500/10 text-white"
                    : "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <h4 className="font-bold text-[15px]">{title}</h4>
                <p className="text-xs text-slate-400 mt-1">{desc}</p>
              </button>
            ))}
          </div>
        ),
        validate: () => ""
      }
    );

    return list;
  }, [goalType, goalDesc, enableLongTerm, hasCourseInMind, courseInput, collegeDegree, collegeEnvironment, collegeFocus, timeCommitment]);

  const stepsPhase3 = useMemo(() => {
    const list = [
      {
        title: "Has your career goal changed?",
        prompt: "Adjust your career goal or explain what role you are targeting now.",
        render: () => (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Goal Category</label>
              <select
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean"
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
              >
                <option value="JOB_ROLE">Job role / Professional position</option>
                <option value="STARTUP">Entrepreneurship</option>
                <option value="HIGHER_STUDIES">Higher studies / Research</option>
                <option value="NOT_SURE">Not sure yet</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Description</label>
              <textarea
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean text-sm h-28"
                value={goalDesc}
                placeholder="e.g. Become a software engineer, or start your own business..."
                onChange={(e) => setGoalDesc(e.target.value)}
              />
            </div>
          </div>
        ),
        validate: () => goalDesc.trim().length > 0 ? "" : "Please describe your career goal."
      },
      {
        title: "What do you want to do next?",
        prompt: "Configure your post-college trajectory based on your situation.",
        render: () => (
          <div className="grid gap-3">
            {[
              ["JUNIOR_ROLE", "💼 Find a Junior Role", "Enter the job market, securing junior roles and scaling to senior positions."],
              ["MASTERS", "🎓 Pursue a Master's / PG Degree", "Prepare for competitive exams (GATE, CAT, GRE) and pursue postgraduate studies."]
            ].map(([val, title, desc]) => (
              <button
                key={val}
                type="button"
                onClick={() => setPostCollegeChoice(val)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  postCollegeChoice === val
                    ? "border-emerald-500 bg-emerald-500/10 text-white"
                    : "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <h4 className="font-bold text-[15px]">{title}</h4>
                <p className="text-xs text-slate-400 mt-1">{desc}</p>
              </button>
            ))}
          </div>
        ),
        validate: () => ""
      }
    ];

    if (postCollegeChoice === "JUNIOR_ROLE") {
      list.push({
        title: "What is your target career progression?",
        prompt: `Select the career goal trajectory you'd like to target after starting your junior role.`,
        render: () => (
          <div className="grid gap-3">
            {[
              ["SENIOR", "💻 Senior Specialist / Individual Contributor", "Focus on technical mastery, software architecture, mentoring, and deep system engineering."],
              ["MANAGER", "👥 Team Manager / Project Lead", "Focus on project delivery, agile execution, people management, and cross-functional leadership."],
              ["EXECUTIVE", "📈 Director / Engineering Executive", "Focus on strategic roadmap alignment, organization-wide architecture, engineering culture, and business metrics."]
            ].map(([val, title, desc]) => (
              <button
                key={val}
                type="button"
                onClick={() => setTargetLeadershipGoal(val)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  targetLeadershipGoal === val
                    ? "border-emerald-500 bg-emerald-500/10 text-white"
                    : "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <h4 className="font-bold text-[15px]">{title}</h4>
                <p className="text-xs text-slate-400 mt-1">{desc}</p>
              </button>
            ))}
          </div>
        ),
        validate: () => ""
      });
    }

    if (postCollegeChoice === "MASTERS") {
      list.push({
        title: "Which tier of college did you get admission into?",
        prompt: "Choose the target academic tier for your PG studies.",
        render: () => (
          <div className="grid gap-3">
            {[
              ["TIER_1", "🏫 Tier 1 Institution (Premier)", "IITs, IISc, Top-tier IIMs, prestigious foreign Ivy League, or leading Central Universities."],
              ["TIER_2", "🏢 Tier 2 Institution (Reputed)", "Reputed State Universities, top regional engineering/commerce campuses, and selective business schools."],
              ["TIER_3", "🏠 Tier 3 / Other colleges", "Local accredited institutions, distance learning options, or regional colleges."]
            ].map(([val, title, desc]) => (
              <button
                key={val}
                type="button"
                onClick={() => setCollegeTier(val)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  collegeTier === val
                    ? "border-emerald-500 bg-emerald-500/10 text-white"
                    : "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <h4 className="font-bold text-[15px]">{title}</h4>
                <p className="text-xs text-slate-400 mt-1">{desc}</p>
              </button>
            ))}
          </div>
        ),
        validate: () => ""
      });

      list.push({
        title: "Which course do you want to pursue?",
        prompt: "Select your target post-graduate major specialization.",
        render: () => {
          const userField = profile.field?.type || "TECH";
          const isTech = userField === "TECH" || userField === "SCIENCE" || goalDesc.toLowerCase().includes("engineer") || goalDesc.toLowerCase().includes("developer") || goalDesc.toLowerCase().includes("data") || goalDesc.toLowerCase().includes("tech");
          
          const courses = isTech
            ? [
                ["M.Tech / MS (Computer Science/IT)", "Advanced study of machine learning, algorithms, and system engineering.", true],
                ["M.S. in Software Engineering / IT", "Focused on application architecture, full-stack design, and cloud systems.", false],
                ["MBA in Technology & Systems Management", "Blends advanced systems architectures with strategic leadership and business.", false]
              ]
            : [
                ["MBA (Management/Finance)", "Standard business post-graduate management stream at premier campuses.", true],
                ["M.Sc / M.S. in Business Analytics & Data", "Focused on quantitative business intelligence, data-driven decisions.", false],
                ["M.Com / Master of Commerce", "Core financial laws, tax planning, auditing, and corporate accounting.", false]
              ];

          return (
            <div className="grid gap-3">
              {courses.map(([val, desc, isRec]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPostGradCourse(val)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                    postGradCourse === val
                      ? "border-emerald-500 bg-emerald-500/10 text-white"
                      : "border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <h4 className="font-bold text-[15px]">
                    {isRec ? <span className="text-emerald-400 font-extrabold mr-1">🌟 (Recommended)</span> : ""}
                    {val}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{desc}</p>
                </button>
              ))}
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Or enter your custom course here..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-850 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-ocean text-xs"
                  value={courses.some(c => c[0] === postGradCourse) ? "" : postGradCourse}
                  onChange={(e) => setPostGradCourse(e.target.value)}
                />
              </div>
            </div>
          );
        },
        validate: () => postGradCourse.trim().length > 0 ? "" : "Please select or type your post-graduate course."
      });
    }

    return list;
  }, [goalType, goalDesc, postCollegeChoice, targetLeadershipGoal, collegeTier, postGradCourse, profile.field?.type]);

  const startStage = profile.startStage || (profile.startedInPhase1 ? "CLASS_7_8" : (profile.startedInPhase2 ? "CLASS_9_10" : "UNDERGRADUATE"));
  const currentSteps = (() => {
    if (startStage === "CLASS_7_8") {
      if (phase === 1) return stepsPhase1;
      if (phase === 2) return stepsPhase2;
      return stepsPhase3;
    }
    if (startStage === "CLASS_9_10") {
      if (phase === 1) return stepsPhase2;
      return stepsPhase3;
    }
    return stepsPhase3;
  })();
  const currentStepData = currentSteps[step];

  const handleNext = () => {
    const err = currentStepData.validate();
    if (err) {
      setError(err);
      return;
    }
    setError("");

    if (step < currentSteps.length - 1) {
      setStep(step + 1);
    } else {
      // Assemble the final updated profile object
      const nextProfile = {
        ...profile,
        goal: {
          type: goalType,
          description: goalDesc
        }
      };

      if (startStage === "CLASS_7_8") {
        if (phase === 1) {
          nextProfile.onboardingPhase = phase + 1;
          nextProfile.stage = "CLASS_11_12"; // Promote stage
          nextProfile.startedInPhase1 = true;
          nextProfile.tenthPath = tenthPath;
          nextProfile.streamElectives = streamElectives;
          nextProfile.prepStyle = prepStyle;
          nextProfile.academicFocus = academicFocus;
        } else if (phase === 2) {
          nextProfile.onboardingPhase = phase + 1;
          nextProfile.stage = "UNDERGRADUATE"; // Promote stage
          nextProfile.startedInPhase2 = true;
          nextProfile.startedInPhase1 = profile.startedInPhase1;
          nextProfile.enableLongTerm = enableLongTerm;
          nextProfile.collegeDegree = collegeDegree;
          nextProfile.collegeEnvironment = collegeEnvironment;
          nextProfile.collegeFocus = collegeFocus;
          nextProfile.timeCommitment = timeCommitment;
        } else {
          // phase === 3
          nextProfile.onboardingPhase = phase + 1;
          nextProfile.stage = postCollegeChoice === "MASTERS" ? "POSTGRADUATE" : "WORKING";
          nextProfile.startedInPhase3 = true;
          nextProfile.startedInPhase2 = profile.startedInPhase2;
          nextProfile.startedInPhase1 = profile.startedInPhase1;
          nextProfile.postCollegeChoice = postCollegeChoice;
        }
      } else if (startStage === "CLASS_9_10") {
        if (phase === 1) {
          nextProfile.onboardingPhase = phase + 1;
          nextProfile.stage = "UNDERGRADUATE"; // Promote stage
          nextProfile.startedInPhase2 = true;
          nextProfile.startedInPhase1 = profile.startedInPhase1;
          nextProfile.enableLongTerm = enableLongTerm;
          nextProfile.collegeDegree = collegeDegree;
          nextProfile.collegeEnvironment = collegeEnvironment;
          nextProfile.collegeFocus = collegeFocus;
          nextProfile.timeCommitment = timeCommitment;
        } else {
          // phase === 2
          nextProfile.onboardingPhase = phase + 1;
          nextProfile.stage = postCollegeChoice === "MASTERS" ? "POSTGRADUATE" : "WORKING";
          nextProfile.startedInPhase3 = true;
          nextProfile.startedInPhase2 = profile.startedInPhase2;
          nextProfile.startedInPhase1 = profile.startedInPhase1;
          nextProfile.postCollegeChoice = postCollegeChoice;
        }
      } else if (startStage === "CLASS_11_12") {
        // phase === 1
        nextProfile.onboardingPhase = phase + 1;
        nextProfile.stage = postCollegeChoice === "MASTERS" ? "POSTGRADUATE" : "WORKING";
        nextProfile.startedInPhase3 = true;
        nextProfile.startedInPhase2 = profile.startedInPhase2;
        nextProfile.startedInPhase1 = profile.startedInPhase1;
        nextProfile.postCollegeChoice = postCollegeChoice;
      } else {
        // startStage === "UNDERGRADUATE", "POSTGRADUATE", "WORKING"
        nextProfile.onboardingPhase = phase + 1;
      }

      if (currentSteps === stepsPhase3) {
        nextProfile.postCollegeChoice = postCollegeChoice;
        nextProfile.targetLeadershipGoal = targetLeadershipGoal;
        nextProfile.collegeTier = collegeTier;
        nextProfile.postGradCourse = postGradCourse;
      }

      onComplete(nextProfile);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setError("");
      setStep(step - 1);
    }
  };

  const progressPct = Math.round(((step + 1) / currentSteps.length) * 100);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-[#0c1524] text-white shadow-2xl overflow-hidden">
        {/* Header decoration */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-ocean" />
        
        {/* Main padding wrapper */}
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                ⚡ Journey Progression Phase {phase + 1}
              </span>
              <h2 className="text-xl font-bold mt-1">Level Up Your Career GPS</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition text-lg px-2 py-1 rounded"
              type="button"
            >
              ✕
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4 flex items-center gap-3">
            <div className="h-1 flex-1 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-ocean transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
              Step {step + 1} of {currentSteps.length}
            </span>
          </div>

          {/* Title & Prompt */}
          <div className="mt-6">
            <h3 className="text-[17px] font-extrabold text-white leading-tight">
              {typeof currentStepData.title === "function" ? currentStepData.title(profile) : currentStepData.title}
            </h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              {currentStepData.prompt}
            </p>
          </div>

          {/* Dynamic Step Content */}
          <div className="mt-6 min-h-[220px]">
            {currentStepData.render()}
          </div>

          {/* Error Message */}
          {error && (
            <p className="mt-4 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg flex items-center gap-1.5 animate-slide-up">
              ⚠️ {error}
            </p>
          )}

          {/* Navigation Controls */}
          <div className="mt-8 flex justify-between gap-4 border-t border-slate-800 pt-6">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 0}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold border border-slate-800 transition ${
                step === 0
                  ? "opacity-35 cursor-not-allowed text-slate-600"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-950/20 hover:shadow-emerald-950/40 transition transform active:scale-95"
            >
              {step === currentSteps.length - 1 ? "Level Up & Regenerate Pathway 🚀" : "Continue"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
