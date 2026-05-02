import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

const getStoredAuth = () => {
  const token = localStorage.getItem("ipl_token");
  const user = localStorage.getItem("ipl_user");
  return {
    token,
    user: user ? JSON.parse(user) : null,
  };
};

export const AuthProvider = ({ children }) => {
  const [{ token, user }, setAuth] = useState(getStoredAuth);

  const login = (payload) => {
    const username = payload?.user?.username?.trim();
    if (!username) return;
    const safePayload = {
      token: payload?.token || "guest-session",
      user: { username, email: payload?.user?.email || "" },
    };
    localStorage.setItem("ipl_token", safePayload.token);
    localStorage.setItem("ipl_user", JSON.stringify(safePayload.user));
    setAuth(safePayload);
  };

  const logout = () => {
    localStorage.removeItem("ipl_token");
    localStorage.removeItem("ipl_user");
    setAuth({ token: null, user: null });
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(user?.username),
      login,
      logout,
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
