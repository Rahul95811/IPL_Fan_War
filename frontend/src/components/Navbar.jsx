import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
    navigate("/welcome");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-700/80 bg-slate-900/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-indigo-500 font-bold text-slate-950">
            <span className="text-sm">IPL</span>
          </div>
          <Link to="/" className="text-xl font-bold text-white tracking-tight">
            IPL Fan War
          </Link>
        </div>

        {isAuthenticated && (
          <nav className="hidden items-center gap-8 md:flex">
            <Link to="/" className="text-sm font-semibold text-cyan-300 relative after:absolute after:bottom-[-16px] after:left-0 after:h-1 after:w-full after:bg-cyan-400 after:content-['']">Matches</Link>
          </nav>
        )}

        <div className="flex items-center gap-5 text-sm">
          {isAuthenticated ? (
            <>
              <div className="relative" ref={dropdownRef}>
                <div className="flex cursor-pointer items-center gap-2" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                  <img src={`https://ui-avatars.com/api/?name=${user?.username}&background=111827&color=22d3ee`} alt="avatar" className="h-8 w-8 rounded-full border-2 border-slate-600" />
                  <span className="hidden font-medium text-slate-200 sm:inline">Hi, {user?.username}</span>
                  <svg className={`h-4 w-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md border border-slate-700 bg-slate-900 py-1 shadow-lg ring-1 ring-black/20">
                    <div className="px-4 py-2 border-b border-slate-700">
                      <p className="text-sm text-slate-300">Signed in as</p>
                      <p className="text-sm font-medium text-white truncate">{user?.email || user?.username}</p>
                    </div>
                    <button onClick={handleLogout} className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700 transition-colors">
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link className="rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-2 font-medium text-slate-950 transition hover:from-cyan-400 hover:to-indigo-400" to="/welcome">Set username</Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
