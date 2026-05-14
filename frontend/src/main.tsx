import React from "react"
import { createRoot } from "react-dom/client"
import DealrApp from "./dealr-app.tsx"

createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <DealrApp />
  </React.StrictMode>
)