import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./workforce-app-screens.jsx";
import { BlankScreenSafety } from "./protect-from-blank-screen.jsx";
import "./app-look-and-layout.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BlankScreenSafety>
      <App />
    </BlankScreenSafety>
  </React.StrictMode>,
);
