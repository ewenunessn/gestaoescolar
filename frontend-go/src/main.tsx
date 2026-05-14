import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { applyTheme, loadThemeName } from "./theme/themes";
import "./styles.css";

applyTheme(loadThemeName());

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
