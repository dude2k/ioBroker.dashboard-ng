import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "@dashboard-ng/runtime/styles.css";
import "./styles.css";

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
