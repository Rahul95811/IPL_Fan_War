import axios from "axios";
const API = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ipl_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  register: (payload) => api.post("/api/auth/register", payload),
  login: (payload) => api.post("/api/auth/login", payload),
  guestLogin: (payload) => api.post("/api/auth/guest", payload),
};

export const matchApi = {
  getLiveMatches: () => api.get("/api/matches/live"),
  getMatchById: (id) => api.get(`/api/matches/${id}`),
};

export const voteApi = {
  submitVote: (payload) => api.post("/api/vote", payload),
  getStats: (matchId) => api.get(`/api/vote/${matchId}`),
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
