import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./AllWorkForceScreens.jsx";
import { BlankScreenSafety } from "./BlankScreenSafety.jsx";
import "./AppVisualDesign.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BlankScreenSafety>
      <App />
    </BlankScreenSafety>
  </React.StrictMode>,
);
