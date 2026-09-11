import { useEffect, useState } from "react";
import { WebGLShader } from "@/components/ui/web-gl-shader";

const phrases = [
  "Your future is being crafted ✨",
  "Mapping every milestone ahead 🗺️",
  "Connecting your skills to your dreams 🌟",
  "Charting the road less ordinary 🚀",
  "Planting seeds for your career garden 🌱",
];

export default function GeneratingScreen() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setPhraseIndex((i) => (i + 1) % phrases.length);
        setFade(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-black px-6 overflow-hidden">
      {/* Background Shader & Contrast Protection Overlay */}
      <WebGLShader />
      <div className="absolute inset-0 bg-[#0c1524]/65 pointer-events-none z-0" />

      <section className="relative w-full max-w-lg text-center z-10">
        {/* Animated glowing orb */}
        <div className="relative mx-auto mb-8 h-24 w-24">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: "2.5s" }} />
          <div className="absolute inset-2 rounded-full bg-emerald-500/10 animate-ping" style={{ animationDuration: "3s", animationDelay: "0.5s" }} />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-ocean/20 backdrop-blur-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-emerald-500/20 border-t-emerald-400" style={{ animationDuration: "1.2s" }} />
          </div>
        </div>

        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-400/80">Mapping your path</p>
        <h1 className="mt-3 text-3xl font-extrabold text-white md:text-4xl">Building your personalized roadmap...</h1>

        {/* Rotating motivational phrase */}
        <p
          className="mt-5 text-lg font-medium text-slate-300 transition-opacity duration-400"
          style={{ opacity: fade ? 1 : 0 }}
        >
          {phrases[phraseIndex]}
        </p>
      </section>
    </main>
  );
}
