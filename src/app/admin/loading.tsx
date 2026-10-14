export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#070b13] p-6 space-y-6 font-mono animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="space-y-2">
          <div className="h-6 w-56 rounded-lg bg-slate-900 border border-slate-800" />
          <div className="h-3 w-80 rounded bg-slate-900/60" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-28 rounded-lg bg-slate-900 border border-slate-800" />
          <div className="h-8 w-24 rounded-lg bg-slate-900 border border-slate-800" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-900/80 border border-slate-800 p-4 space-y-3">
            <div className="h-3 w-20 rounded bg-slate-800" />
            <div className="h-8 w-24 rounded bg-slate-800/80" />
            <div className="h-2 w-32 rounded bg-slate-800/50" />
          </div>
        ))}
      </div>

      {/* Main Workspace Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 flex flex-col justify-between">
          <div className="h-4 w-40 rounded bg-slate-800" />
          <div className="h-64 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-center text-xs text-slate-600">
            Initializing Airspace Telemetry & Radar Feeds...
          </div>
        </div>
        <div className="h-96 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
          <div className="h-4 w-32 rounded bg-slate-800" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-slate-950 border border-slate-800/80" />
          ))}
        </div>
      </div>
    </div>
  );
}
