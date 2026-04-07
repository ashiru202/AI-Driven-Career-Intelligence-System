const app = document.getElementById("app");

if (app) {
  const status = document.createElement("p");
  status.textContent = "Extension popup scaffold initialized.";
  app.appendChild(status);
}
