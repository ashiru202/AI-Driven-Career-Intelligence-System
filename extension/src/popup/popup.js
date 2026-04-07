const app = document.getElementById("app");

function sendRuntimeMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        resolve({ ok: false, error: runtimeError.message });
        return;
      }

      resolve(response || { ok: false, error: "No response from background." });
    });
  });
}

async function renderStatus() {
  if (!app) {
    return;
  }

  const status = document.createElement("p");
  status.textContent = "Checking background service worker...";
  app.appendChild(status);

  const pingResponse = await sendRuntimeMessage({ type: "EXTENSION/PING" });
  if (pingResponse.ok) {
    status.textContent = "Background service worker connected.";
    return;
  }

  status.textContent = `Background error: ${pingResponse.error || "Unknown error"}`;
}

renderStatus();
