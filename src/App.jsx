import React from "react";
import WildfireIntelligence from "./WildfireIntelligence.jsx";

export default function App() {
  return (
    <div className="wildfire-standalone">
      <header className="wildfire-site-header">
        <div className="wildfire-site-brand">
          <div className="brand-mark">CI</div>

          <div>
            <strong>Cielar Wildfire Intelligence</strong>
            <span>Jasper 2024 Catastrophe Demonstrator</span>
          </div>
        </div>

        <div className="wildfire-site-tag">
          Earth intelligence · Wildfire risk
        </div>
      </header>

      <main className="wildfire-standalone-main">
        <WildfireIntelligence />
      </main>

      <footer className="wildfire-site-footer">
        <span>
          Developed by <strong>Yusof Ghiasi</strong> &middot; Cielar
        </span>
      </footer>
    </div>
  );
}
