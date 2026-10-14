export default function BaggageLoading() {
  return (
    <div className="p-6 space-y-6 font-mono animate-pulse">
      <div className="border-b border-slate-800 pb-4 space-y-2">
        <div className="h-6 w-64 rounded bg-slate-800" />
        <div className="h-3 w-80 rounded bg-slate-800/60" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-900/60 border border-slate-800 p-4 space-y-2">
            <div className="h-3 w-24 rounded bg-slate-800" />
            <div className="h-7 w-16 rounded bg-slate-800/80" />
          </div>
        ))}
      </div>

      <div className="h-72 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 flex items-center justify-center text-xs text-slate-600">
        Loading Baggage Carousel & 3D CT Screening Matrix...
      </div>
    </div>
  );
}
