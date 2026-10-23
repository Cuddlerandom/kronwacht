import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GameScreen } from "@/components/GameScreen";
import "@/styles.css";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <GameScreen />
    </StrictMode>,
  );
}
