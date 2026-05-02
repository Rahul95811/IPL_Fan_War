function LiveScoreCard({ match, loading, warning }) {
  if (loading) {
    return <div className="rounded-xl bg-white p-4 shadow-sm">Loading live score...</div>;
  }

  if (!match) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm">
        No live IPL match found currently.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{match.title}</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:text-base">
        <p className="text-slate-500">Score</p>
        <p className="text-right font-semibold text-slate-800">{match.score}</p>
        <p className="text-slate-500">Overs</p>
        <p className="text-right font-semibold text-slate-800">{match.overs}</p>
        <p className="text-slate-500">Status</p>
        <p className="text-right font-semibold text-emerald-700">{match.status}</p>
      </div>
      {warning && <p className="mt-3 text-xs text-amber-700">{warning}</p>}
    </div>
  );
}

export default LiveScoreCard;
