import { useState } from "react";
import { voteApi } from "../services/api";

function VotePanel({ match, voteStats, onVoteSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!match) {
    return null;
  }

  const options = [match.teamA, match.teamB];

  const handleVote = async (team) => {
    setSubmitting(true);
    setError("");
    try {
      const { data } = await voteApi.submitVote({ matchId: match.matchId, team });
      onVoteSuccess(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to submit vote");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-100 sm:text-lg">Fan War Voting</h3>
      <p className="mt-1 text-sm text-slate-400">Pick your winner for this match.</p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((team) => (
          <button
            key={team}
            disabled={submitting}
            onClick={() => handleVote(team)}
            className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Vote {team}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <div className="mt-4 space-y-2">
        {options.map((team) => (
          <div key={`${team}-pct`}>
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>{team}</span>
              <span>{voteStats?.percentages?.[team] || 0}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all"
                style={{ width: `${voteStats?.percentages?.[team] || 0}%` }}
              />
            </div>
          </div>
        ))}
        <p className="text-xs text-slate-500">Total votes: {voteStats?.totalVotes || 0}</p>
      </div>
    </div>
  );
}

export default VotePanel;
