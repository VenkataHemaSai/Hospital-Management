import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true, // Send cookies (JWT) with every request
});

// Global response interceptor
// IMPORTANT: Do NOT redirect on 401 here — that would break public pages.
// The auth check (/auth/me) naturally fails with 401 when not logged in.
// Route-level guards in App.jsx handle the redirect to /login instead.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login if:
    // 1. It's a 401 error
    // 2. It's NOT the auth-check call itself (to avoid infinite loops)
    // 3. User is currently on a protected page (not public routes)
    const isAuthCheck = error.config?.url?.includes("/auth/me");
    const isOnPublicPage = ["/", "/about", "/our-doctors", "/contact", "/apply-doctor", "/login", "/register", "/register-doctor"].some(
      (path) => window.location.pathname === path || window.location.pathname.startsWith(path)
    );

    if (error.response?.status === 401 && !isAuthCheck && !isOnPublicPage) {
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default api;
