import { useEffect } from "react";
import api from "../api/api";

export default function Logout() {
  useEffect(() => {
    // Ask the server to clear the httpOnly JWT cookie, then wipe display data
    api.post("/api/auth/logout").finally(() => {
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      window.location.href = "/login";
    });
  }, []);
  return null;
}
