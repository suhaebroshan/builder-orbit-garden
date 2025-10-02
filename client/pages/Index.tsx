import Emulator from "@/emulator/Emulator";

export default function Index() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex items-center justify-between mb-8">
          <div className="text-2xl font-bold tracking-tight">Web Android Emulator</div>
          <div className="text-sm opacity-70">Experimental build • Runs entirely in your browser</div>
        </header>
        <main className="grid place-items-center">
          <div className="w-full flex items-center justify-center py-6">
            <Emulator />
          </div>
        </main>
        <footer className="mt-8 text-center text-xs opacity-60">
          Tip: scroll down to open notifications • press "q" for Quick Settings
        </footer>
      </div>
    </div>
  );
}
