import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../services/api";

function AuthPage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    const safeName = username.trim();
    if (!safeName) return;
    
    setLoading(true);
    setError("");
    try {
      const { data } = await authApi.guestLogin({ username: safeName });
      login(data);
      navigate("/");
    } catch (err) {
      setError(err?.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-md items-center px-4 py-6">
      <div className="w-full rounded-2xl border border-slate-700/80 bg-slate-900/90 p-5 shadow-2xl shadow-cyan-900/20 sm:p-6">
        <h1 className="text-2xl font-bold text-slate-100">Welcome to IPL Fan War</h1>
        <p className="mt-2 text-sm text-slate-400">Enter your username to join live chat and voting.</p>
        {error && <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-center text-xs text-red-400">{error}</div>}
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            placeholder="Username"
          />
          <button
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 px-3 py-2 text-sm font-medium text-slate-950 hover:from-cyan-400 hover:to-indigo-400 disabled:opacity-70"
          >
            {loading ? "Joining..." : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default AuthPage;
