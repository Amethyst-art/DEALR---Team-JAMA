import React from "react"
import { createRoot } from "react-dom/client"
import DealrApp from "./newDealr-app.tsx"

createRoot(document.getElementById("app")!).render(
  <React.StrictMode>
    <DealrApp />
  </React.StrictMode>
)