export default function PilotLoading() {
  return (
    <div className="p-6 space-y-6 font-mono animate-pulse">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="space-y-2">
          <div className="h-6 w-64 rounded-lg bg-slate-900 border border-slate-800" />
          <div className="h-3 w-80 rounded bg-slate-900/60" />
        </div>
      </div>

      <div className="h-96 rounded-2xl bg-black border-4 border-slate-800 p-6 flex items-center justify-center text-xs text-cyan-400/60">
        Aligning Primary Flight Display (PFD) Inertial Reference Gyros...
      </div>

      <div className="h-48 rounded-xl bg-slate-900/60 border border-slate-800 p-4" />
    </div>
  );
}
