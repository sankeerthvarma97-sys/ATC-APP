export default function AtcLoading() {
  return (
    <div className="p-6 space-y-6 font-mono animate-pulse">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="space-y-2">
          <div className="h-6 w-64 rounded-lg bg-slate-900 border border-slate-800" />
          <div className="h-3 w-80 rounded bg-slate-900/60" />
        </div>
      </div>

      <div className="h-96 rounded-2xl bg-slate-950 border-2 border-emerald-900/40 p-6 flex items-center justify-center text-xs text-emerald-500/60">
        Calibrating Tower ASDE-X Surface Movement Radar & En-Route Feeds...
      </div>

      <div className="h-64 rounded-xl bg-slate-900/60 border border-slate-800 p-4" />
    </div>
  );
}
