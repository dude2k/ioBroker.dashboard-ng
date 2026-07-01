import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ViewerApp } from "./App";
import "@dashboard-ng/runtime/styles.css";
import "./styles.css";

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <StrictMode>
      <ViewerApp />
    </StrictMode>,
  );
}
