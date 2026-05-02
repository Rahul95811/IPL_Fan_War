import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { matchApi } from "../services/api";

function HomePage() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState("");

  const fetchMatches = async () => {
    try {
      const { data } = await matchApi.getLiveMatches();
      setMatches(Array.isArray(data.matches) ? data.matches : []);
      setWarning(data.warning || "");
    } catch {
      setWarning("Could not load matches at the moment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 3000);
    return () => clearInterval(interval);
  }, []);

  const initials = (name) =>
    `${name || ""}`
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("");

  return (
    <main className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-6 sm:py-8">
      {warning && <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-300">{warning}</p>}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-slate-400">Loading IPL Fan War...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 shadow-sm">
          <p className="font-medium text-slate-300">No active or upcoming IPL matches for today/tomorrow.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 lg:gap-8">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">IPL Matches</h1>
            <p className="mt-1 text-sm text-slate-400 sm:text-base">Live, Today & Tomorrow's Action</p>
          </div>

          <div className="grid gap-6 sm:gap-8">
            {matches.map((match) => (
              <div key={match.matchId} className={`overflow-hidden rounded-2xl border bg-slate-900 text-white shadow-lg transition-all hover:scale-[1.01] ${match.isLive ? 'border-cyan-500/50 shadow-cyan-950/20 ring-1 ring-cyan-500/20' : 'border-slate-700/70'}`}>
                <div className={`relative p-4 sm:p-6 ${match.isLive ? 'bg-gradient-to-r from-cyan-900/30 to-indigo-900/30' : 'bg-slate-800/20'}`}>
                  
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-6 sm:mb-8">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold shadow-sm sm:text-xs ${match.isLive ? 'bg-cyan-500 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>
                      {match.isLive ? "Live" : (match.isToday ? "Today" : (match.isTomorrow ? "Tomorrow" : "Upcoming"))}
                    </span>
                    <span className="text-[10px] sm:text-xs font-medium text-slate-300 truncate">
                      {(match.title || "").replace(/,.*/, "")} • IPL
                    </span>
                  </div>

                  {/* Teams */}
                  <div className="flex items-center justify-between px-1 sm:px-8">
                    <div className="flex flex-col items-center gap-2 sm:gap-3 w-[40%]">
                      <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-full bg-slate-800 p-1.5 sm:p-2 border-2 border-slate-700 flex items-center justify-center overflow-hidden">
                        <img src={`https://ui-avatars.com/api/?name=${match.teamA}&background=0f172a&color=22d3ee&size=128`} alt={match.teamA} className="h-full w-full object-contain" />
                      </div>
                      <div className="text-center">
                        <h2 className="text-lg sm:text-2xl font-bold">{initials(match.teamAShort || match.teamA)}</h2>
                        <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block truncate w-full px-2">{match.teamA}</p>
                      </div>
                    </div>

                    <div className="flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-slate-800 border border-slate-700 shadow-inner shrink-0">
                      <span className="text-xs sm:text-base font-bold text-slate-400">VS</span>
                    </div>

                    <div className="flex flex-col items-center gap-2 sm:gap-3 w-[40%]">
                      <div className="h-14 w-14 sm:h-20 sm:w-20 rounded-full bg-slate-800 p-1.5 sm:p-2 border-2 border-slate-700 flex items-center justify-center overflow-hidden">
                        <img src={`https://ui-avatars.com/api/?name=${match.teamB}&background=0f172a&color=818cf8&size=128`} alt={match.teamB} className="h-full w-full object-contain" />
                      </div>
                      <div className="text-center">
                        <h2 className="text-lg sm:text-2xl font-bold">{initials(match.teamBShort || match.teamB)}</h2>
                        <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block truncate w-full px-2">{match.teamB}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="bg-slate-900 p-4 text-slate-300 sm:p-5">
                  <div className="mb-4 grid gap-4 border-b border-slate-700 pb-4 sm:mb-5 sm:grid-cols-2 sm:pb-5">
                    {match.isLive || match.isCompleted ? (
                      <>
                        <div className="text-center sm:text-left">
                          <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-1">Score</p>
                          <p className="text-base font-bold text-slate-100 sm:text-lg">
                            {match.scoreLive || match.score || "N/A"}
                          </p>
                          {match.scoreLiveLine2 && <p className="text-sm font-semibold text-slate-200">{match.scoreLiveLine2}</p>}
                        </div>
                        <div className="text-center sm:text-left">
                          <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-1">Status</p>
                          <p className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold sm:text-xs ${match.isLive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                            {match.statusDetail || match.status || (match.isLive ? "Live" : "Upcoming")}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="sm:col-span-2 text-center sm:text-left">
                        <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-1">Starts</p>
                        <p className="text-lg font-bold text-slate-50 sm:text-2xl">
                          {match.startTimeUi || match.localStartTimeDisplay || "—"}
                        </p>
                      </div>
                    )}
                    <div className="sm:col-span-2 text-center sm:text-left">
                      <p className="text-[10px] sm:text-xs font-medium text-slate-500 mb-1">Venue</p>
                      <p className="line-clamp-1 text-xs font-medium text-slate-400">{match.venue || "Venue —"}</p>
                    </div>
                  </div>

                  <Link
                    to={`/match/${match.matchId}`}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold shadow-md transition sm:py-3 ${match.isLive ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 hover:from-cyan-400 hover:to-indigo-400' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" /><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" /></svg>
                    {match.isLive ? "Enter Match Center" : "View Details"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

export default HomePage;
