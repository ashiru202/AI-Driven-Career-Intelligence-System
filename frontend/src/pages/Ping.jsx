import { useEffect, useState } from "react";

export default function Ping() {
  const [msg, setMsg] = useState("Loading...");

  useEffect(() => {
    fetch("http://localhost:5000/")
      .then((r) => r.text())
      .then(setMsg)
      .catch(() => setMsg("Ping failed (CORS or server down)"));
  }, []);

  return (
    <div style={{ maxWidth: 700, margin: "40px auto" }}>
      <h2>Ping Test</h2>
      <p>{msg}</p>
    </div>
  );
}
