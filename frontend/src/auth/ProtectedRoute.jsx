import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  // The JWT lives in an httpOnly cookie (invisible to JS).
  // We use the non-sensitive user/role display data as a client-side session hint.
  // The backend will reject any request with a missing/expired cookie with 401,
  // which the api.js response interceptor converts to a redirect to /login.
  const userRaw = localStorage.getItem("user");
  const role = localStorage.getItem("role");

  if (!userRaw) return <Navigate to="/login" replace />;
  if (!role) return <Navigate to="/login" replace />;

  let user = null;
  try {
    user = JSON.parse(userRaw);
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    return <Navigate to="/login" replace />;
  }

  if (user?.mustChangePassword && location.pathname !== "/force-change-password") {
    return <Navigate to="/force-change-password" replace />;
  }

  return children;
}
