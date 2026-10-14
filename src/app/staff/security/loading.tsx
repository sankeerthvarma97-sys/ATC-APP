export default function SecurityLoading() {
  return (
    <div className="p-6 space-y-6 font-mono animate-pulse">
      <div className="border-b border-slate-800 pb-4 space-y-2">
        <div className="h-6 w-64 rounded bg-slate-800" />
        <div className="h-3 w-80 rounded bg-slate-800/60" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-2">
            <div className="h-3 w-28 rounded bg-slate-800" />
            <div className="h-7 w-20 rounded bg-slate-800/80" />
          </div>
        ))}
      </div>
    </div>
  );
}
