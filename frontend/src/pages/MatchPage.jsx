import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ChatPanel from "../components/ChatPanel";
import VotePanel from "../components/VotePanel";
import { matchApi, voteApi } from "../services/api";
import socket from "../services/socket";

function MatchPage() {
  const { matchId } = useParams();
  const [matchData, setMatchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [voteStats, setVoteStats] = useState({ totalVotes: 0, percentages: {} });
  const [countdown, setCountdown] = useState(2);

  const fetchMatchDetails = useCallback(async () => {
    try {
      const { data } = await matchApi.getMatchById(matchId);
      setMatchData(data.match);
      setError("");
    } catch {
      setError("Match not found or error loading details.");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  const fetchVoteStats = useCallback(async () => {
    try {
      const { data } = await voteApi.getStats(matchId);
      setVoteStats(data);
    } catch {
      // Ignore vote fetch errors
    }
  }, [matchId]);

  useEffect(() => {
    const initTimer = setTimeout(() => {
      fetchMatchDetails();
      fetchVoteStats();
    }, 0);

    const interval = setInterval(() => {
      fetchMatchDetails();
    }, 2000);
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 2 : prev - 1));
    }, 1000);

    // Keep live updates in React state and avoid DOM mutations.
    const handleScoreUpdate = (data) => {
      if (data.matchId && data.matchId !== matchId) return;
      setMatchData((prev) =>
        prev
          ? {
              ...prev,
              score: [{ r: data.runs || prev.score?.[0]?.r, w: data.wickets || prev.score?.[0]?.w, o: data.overs || prev.score?.[0]?.o }],
              status: data.status || prev.status,
            }
          : prev
      );
    };

    const handleVoteUpdate = (data) => {
      if (data.matchId && data.matchId !== matchId) return;
      setVoteStats({ totalVotes: data.totalVotes, percentages: data.percentages });
    };

    const onConnect = () => {
      socket.emit("join_match", { matchId });
    };

    if (!socket.connected) {
      socket.connect();
    } else {
      onConnect();
    }

    socket.on("connect", onConnect);
    socket.on("score_update", handleScoreUpdate);
    socket.on("vote_update", handleVoteUpdate);

    setCountdown(2); // Initial reset
    
    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
      clearInterval(timer);
      socket.off("connect", onConnect);
      socket.off("score_update", handleScoreUpdate);
      socket.off("vote_update", handleVoteUpdate);
    };
  }, [fetchMatchDetails, fetchVoteStats, matchId]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading match details...</div>;
  }

  if (error || !matchData) {
    return (
      <div className="p-8 text-center text-red-400">
        <p>{error || "Match not found"}</p>
        <Link to="/" className="mt-4 inline-block font-medium text-cyan-400 hover:underline">← Back to Matches</Link>
      </div>
    );
  }

  // Safely extract data
  const title = matchData.name || `${matchData.teamInfo?.[0]?.shortname || "Team A"} vs ${matchData.teamInfo?.[1]?.shortname || "Team B"}`;
  const score =
    Array.isArray(matchData.score) && matchData.score.length > 0
      ? `${matchData.score[0]?.r ?? 0}/${matchData.score[0]?.w ?? 0}`
      : typeof matchData.score === "string"
        ? matchData.score
        : "N/A";
  const overs = matchData.score?.[0]?.o || matchData.overs || "N/A";
  const status = matchData.status || "Status unavailable";
  const venue = matchData.venue || "Venue unavailable";
  const matchType = matchData.matchType || "T20";

  // Dummy match obj for VotePanel since it expects { matchId, teamA, teamB }
  const voteMatchObj = {
    matchId,
    teamA: matchData.teamInfo?.[0]?.shortname || "Team A",
    teamB: matchData.teamInfo?.[1]?.shortname || "Team B"
  };

  return (
    <main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-4 sm:px-6 lg:grid-cols-12">
      <section className="order-1 space-y-4 lg:col-span-8">

        {/* Basic Info */}
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
          <Link to="/" className="mb-3 inline-block text-sm font-medium text-cyan-400 hover:underline">← Back to matches</Link>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
            <div>
              <h1 className="text-xl font-bold text-slate-100">{title}</h1>
              <p className="mt-1 text-sm text-slate-400">{matchType} • {venue}</p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-3xl font-bold tracking-tight text-slate-100">{score} <span className="text-lg font-normal text-slate-400">({overs})</span></div>
              <div className="mt-1 text-sm font-semibold text-emerald-400">{status}</div>
              <div className="flex items-center gap-2 mt-2 sm:justify-end">
                <div className="inline-block rounded bg-cyan-500/20 px-2 py-1 text-xs font-bold text-cyan-300">{score} ({overs})</div>
                <div className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
                  </span>
                  Updates in {countdown}s
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full Scorecard */}
        {Array.isArray(matchData.scorecard) && matchData.scorecard.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-100">Scorecard</h2>
            {matchData.scorecard.map((innings, idx) => (
              <div key={idx} className="mb-8 last:mb-0">
                <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 p-3">
                  <h3 className="font-bold text-slate-100">{innings.inning}</h3>
                  <span className="font-semibold text-slate-300">{innings.r}/{innings.w} ({innings.o})</span>
                </div>

                {/* Batting */}
                {innings.batting && innings.batting.length > 0 && (
                  <div className="mb-5 overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="border-b border-slate-700 bg-slate-800/40 text-xs uppercase text-slate-400">
                        <tr>
                          <th className="py-2.5 px-2 font-semibold">Batter</th>
                          <th className="py-2.5 px-2 font-semibold text-right">R</th>
                          <th className="py-2.5 px-2 font-semibold text-right">B</th>
                          <th className="py-2.5 px-2 font-semibold text-right hidden sm:table-cell">4s</th>
                          <th className="py-2.5 px-2 font-semibold text-right hidden sm:table-cell">6s</th>
                          <th className="py-2.5 px-2 font-semibold text-right">SR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {innings.batting.map((batter, bIdx) => (
                          <tr key={bIdx} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/40">
                            <td className="px-2 py-2.5 font-medium text-slate-100">
                              {batter.batsman?.name || "Unknown"}
                              {batter.dismissal === "not out" && <span className="ml-1 text-emerald-400">*</span>}
                              {batter.dismissal && batter.dismissal !== "not out" && <div className="mt-0.5 text-[11px] font-normal text-slate-500">{batter.dismissal}</div>}
                            </td>
                            <td className="px-2 py-2.5 text-right font-bold text-slate-200">{batter.r}</td>
                            <td className="px-2 py-2.5 text-right text-slate-300">{batter.b}</td>
                            <td className="hidden px-2 py-2.5 text-right text-slate-300 sm:table-cell">{batter['4s']}</td>
                            <td className="hidden px-2 py-2.5 text-right text-slate-300 sm:table-cell">{batter['6s']}</td>
                            <td className="px-2 py-2.5 text-right text-slate-300">{batter.sr}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Bowling */}
                {innings.bowling && innings.bowling.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead className="border-b border-slate-700 bg-slate-800/40 text-xs uppercase text-slate-400">
                        <tr>
                          <th className="py-2.5 px-2 font-semibold">Bowler</th>
                          <th className="py-2.5 px-2 font-semibold text-right">O</th>
                          <th className="py-2.5 px-2 font-semibold text-right hidden sm:table-cell">M</th>
                          <th className="py-2.5 px-2 font-semibold text-right">R</th>
                          <th className="py-2.5 px-2 font-semibold text-right">W</th>
                          <th className="py-2.5 px-2 font-semibold text-right">Econ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {innings.bowling.map((bowler, bwIdx) => (
                          <tr key={bwIdx} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/40">
                            <td className="px-2 py-2.5 font-medium text-slate-100">{bowler.bowler?.name || "Unknown"}</td>
                            <td className="px-2 py-2.5 text-right text-slate-300">{bowler.o}</td>
                            <td className="hidden px-2 py-2.5 text-right text-slate-300 sm:table-cell">{bowler.m}</td>
                            <td className="px-2 py-2.5 text-right text-slate-300">{bowler.r}</td>
                            <td className="px-2 py-2.5 text-right font-bold text-slate-200">{bowler.w}</td>
                            <td className="px-2 py-2.5 text-right text-slate-300">{bowler.eco}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <VotePanel match={voteMatchObj} voteStats={voteStats} onVoteSuccess={fetchVoteStats} />
      </section>

      <section className="order-2 space-y-4 lg:col-span-4">
        <ChatPanel matchId={matchId} />
      </section>
    </main>
  );
}

export default MatchPage;
