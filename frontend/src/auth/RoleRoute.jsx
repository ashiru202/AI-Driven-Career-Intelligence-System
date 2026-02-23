import { Navigate } from "react-router-dom";

export default function RoleRoute({ roles = [], children }) {
  const role = localStorage.getItem("role");
  if (roles.length && !roles.includes(role)) return <Navigate to="/dashboard" replace />;
  return children;
}
