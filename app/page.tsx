import { BirthDataForm } from "@/components/onboarding/BirthDataForm";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[100dvh] px-6 bg-neutral-950">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2">
          <div className="text-neutral-600 text-xl">◈</div>
          <h1 className="text-lg font-medium text-neutral-200 tracking-tight">Mystic Council</h1>
          <p className="text-sm text-neutral-600 leading-relaxed">
            Five traditions. One question. Enter your birth details for a more precise reading, or skip to ask anything.
          </p>
        </div>

        <div className="text-xs text-neutral-700 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-indigo-500">✦</span>
            <span>Western Astrology · Stella</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-500">☯</span>
            <span>Chinese Astrology · Master Wei</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-500">🪬</span>
            <span>Vedic Jyotish · Priya</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-violet-500">🃏</span>
            <span>Tarot · Madame Crow</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-500">∞</span>
            <span>Numerology · Pythia</span>
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-900">
            <span className="text-yellow-700">◈</span>
            <span>Synthesized by The Oracle</span>
          </div>
        </div>

        <BirthDataForm />
      </div>
    </main>
  );
}
