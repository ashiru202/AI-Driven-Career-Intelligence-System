import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  // The JWT lives in an httpOnly cookie (invisible to JS).
  // We use the non-sensitive user/role display data as a client-side session hint.
  // The backend will reject any request with a missing/expired cookie with 401,
  // which the api.js response interceptor converts to a redirect to /login.
  const user = localStorage.getItem("user");
  const role = localStorage.getItem("role");

  if (!user) return <Navigate to="/login" replace />;
  if (!role) return <Navigate to="/login" replace />;

  return children;
}
