import React, { startTransition } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/transitions.css";

// Configuração para compatibilidade com React Router v7
const router = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App routerConfig={router} />
  </React.StrictMode>
);
