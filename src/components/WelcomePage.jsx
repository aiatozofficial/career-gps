import { WebGLShader } from "@/components/ui/web-gl-shader";
import { LiquidButton } from "@/components/ui/liquid-glass-button";

export default function WelcomePage({ onGetStarted }) {
  return (
    <main className="min-h-screen overflow-hidden bg-black text-white relative flex items-center">
      {/* Background Shader & Contrast Protection Overlay */}
      <WebGLShader />
      <div className="absolute inset-0 bg-[#0c1524]/65 pointer-events-none z-0" />

      <section className="relative mx-auto flex min-h-screen max-w-7xl items-center px-5 py-10 md:px-8 z-10 w-full">
        <div className="absolute left-[-120px] top-[-120px] h-80 w-80 rounded-full bg-[#28b7a5] opacity-20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-140px] right-[-100px] h-96 w-96 rounded-full bg-[#f2715b] opacity-20 blur-3xl pointer-events-none" />
        <div className="absolute right-[18%] top-[12%] h-40 w-40 rounded-full bg-[#f7d06b] opacity-10 blur-3xl pointer-events-none" />

        <div className="relative grid w-full gap-10 lg:grid-cols-[1fr_520px] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8fd5c0]">Career GPS</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-black leading-tight md:text-7xl">
              Build a career path that fits your life.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Answer a few focused questions and get a colorful roadmap with goals, courses,
              certifications, internships, and alternate paths shaped around your budget.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <LiquidButton
                onClick={onGetStarted}
                className="text-white border border-white/20 bg-white/5 rounded-full hover:scale-105 transition"
                size="xl"
              >
                Get started →
              </LiquidButton>
            </div>
          </div>

          <div className="relative rounded-lg border border-white/10 bg-white/10 p-5 shadow-soft backdrop-blur">
            <div className="space-y-4">
              <PreviewStep color="bg-red-500" title="Discover your fit" detail="Stage, field, skills, budget" />
              <PreviewStep color="bg-green-500" title="Map your next moves" detail="Courses, certs, internships" />
              <PreviewStep color="bg-blue-500" title="Branch into options" detail="Alternate paths and future goals" />
            </div>
            <div className="mt-6 rounded-lg bg-[#0f1724] p-4">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <div className="h-px flex-1 bg-white/20" />
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-px flex-1 bg-white/20" />
                <div className="h-3 w-3 rounded-full bg-blue-500" />
              </div>
              <p className="mt-4 text-sm text-slate-300">A roadmap that changes when your budget or path changes.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PreviewStep({ color, title, detail }) {
  return (
    <article className="rounded-lg border border-white/10 bg-white/10 p-4">
      <div className={`mb-3 h-2 w-16 rounded-full ${color}`} />
      <h2 className="font-bold">{title}</h2>
      <p className="mt-1 text-sm text-slate-300">{detail}</p>
    </article>
  );
}
