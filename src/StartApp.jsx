import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./MainWorkForceApp.jsx";
import { SafeChangeShield } from "./SafeChangeShield.jsx";
import "./AppDesign.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SafeChangeShield>
      <App />
    </SafeChangeShield>
  </React.StrictMode>,
);
