import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./WorkForceCommandCenter.jsx";
import { SafeChangeGuard } from "./SafeChangeGuard.jsx";
import "./WorkForceScreenDesign.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SafeChangeGuard>
      <App />
    </SafeChangeGuard>
  </React.StrictMode>,
);
