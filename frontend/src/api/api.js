import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5001",
  withCredentials: true,  // send httpOnly JWT cookie on every request
});

// Response interceptor - handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint =
      error.config?.url?.includes("/auth/login") ||
      error.config?.url?.includes("/auth/register") ||
      error.config?.url?.includes("/auth/forgot-password") ||
      error.config?.url?.includes("/auth/reset-password") ||
      error.config?.url?.includes("/auth/verify-email") ||
      error.config?.url?.includes("/auth/resend-verification") ||
      error.config?.url?.includes("/auth/extension-token");
    if (error.response && error.response.status === 401 && !isAuthEndpoint) {
      // Clear non-sensitive display data and redirect to login
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
