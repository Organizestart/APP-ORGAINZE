import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./WorkForceAppScreens.jsx";
import { CrashProtectionScreen } from "./CrashProtectionScreen.jsx";
import "./WorkForceScreenDesign.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CrashProtectionScreen>
      <App />
    </CrashProtectionScreen>
  </React.StrictMode>,
);
