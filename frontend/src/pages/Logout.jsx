import { useEffect } from "react";

export default function Logout() {
  useEffect(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/login";
  }, []);
  return null;
}
