export default function TicketingLoading() {
  return (
    <div className="p-6 space-y-6 font-mono animate-pulse">
      <div className="border-b border-slate-800 pb-4 space-y-2">
        <div className="h-6 w-72 rounded bg-slate-800" />
        <div className="h-3 w-96 rounded bg-slate-800/60" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
          <div className="h-5 w-48 rounded bg-slate-800" />
          <div className="h-20 rounded-xl bg-slate-950 border border-slate-800/80" />
          <div className="h-44 rounded-xl bg-slate-950 border border-slate-800/80" />
        </div>
        <div className="h-96 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
          <div className="h-5 w-36 rounded bg-slate-800" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-950 border border-slate-800/80" />
          ))}
        </div>
      </div>
    </div>
  );
}
