export default function StaffLoading() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-mono animate-pulse">
      {/* Welcome Banner Skeleton */}
      <div className="h-36 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col justify-between">
        <div className="flex gap-2">
          <div className="h-4 w-40 rounded bg-slate-800" />
          <div className="h-4 w-20 rounded bg-slate-800" />
        </div>
        <div className="h-7 w-64 rounded bg-slate-800/80" />
        <div className="h-3 w-96 rounded bg-slate-800/50" />
      </div>

      {/* Role Portals Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-44 rounded-xl bg-slate-900/40 border border-slate-800 p-5 flex flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-800" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 w-32 rounded bg-slate-800" />
                <div className="h-3 w-48 rounded bg-slate-800/60" />
              </div>
            </div>
            <div className="h-8 rounded-lg bg-slate-800/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
