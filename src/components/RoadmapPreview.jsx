import { clearCareerGpsStorage } from "../services/localStorageService";

export default function RoadmapPreview({ profile, roadmap, onReset }) {
  const firstMilestones = roadmap.shortTermGoals.months.slice(0, 3);

  function handleReset() {
    clearCareerGpsStorage();
    onReset();
  }

  return (
    <main className="min-h-screen bg-mist px-5 py-6 md:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-soft md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ocean">Phase 1 output</p>
            <h1 className="mt-2 text-3xl font-bold text-ink">Welcome, {profile.name}</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Your onboarding profile and mock roadmap both passed Zod validation. The full dashboard,
              tree, progress tracker, and filters arrive in the next phases.
            </p>
          </div>
          <button
            className="focus-ring rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={handleReset}
          >
            Start over
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <SummaryCard label="Stage" value={profile.stage.replaceAll("_", " ")} />
          <SummaryCard label="Field" value={profile.field.type === "OTHER" ? profile.field.customValue : profile.field.type} />
          <SummaryCard label="Financial tier" value={profile.financialTier} />
        </div>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-bold text-ink">Validated mock roadmap preview</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {firstMilestones.map((month) => (
              <article key={month.month} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-ocean">Month {month.month}</p>
                <h3 className="mt-2 font-bold text-ink">{month.milestones[0].title}</h3>
                <p className="mt-2 text-sm text-slate-600">{month.milestones[0].detail}</p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function SummaryCard({ label, value }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-bold text-ink">{value}</p>
    </article>
  );
}
