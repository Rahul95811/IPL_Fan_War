import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ipl_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  register: (payload) => api.post("/auth/register", payload),
  login: (payload) => api.post("/auth/login", payload),
  guestLogin: (payload) => api.post("/auth/guest", payload),
};

export const matchApi = {
  getLiveMatches: () => api.get("/matches/live"),
  getMatchById: (id) => api.get(`/matches/${id}`),
};

export const voteApi = {
  submitVote: (payload) => api.post("/vote", payload),
  getStats: (matchId) => api.get(`/vote/${matchId}`),
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("ipl_token");
      localStorage.removeItem("ipl_user");
      if (window.location.pathname !== "/welcome") {
        window.location.href = "/welcome";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
