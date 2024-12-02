import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import App from "./App";
import LogDetails from "./LogDetails";
import MainPlot from "./MainPlot";
import CombinedLogsPlot from "./CombaindLogs";
import PlotV3 from "./MainPlot";

function AppWrapper() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/main" element={<MainPlot />} />
        <Route path="/log/:time" element={<LogDetails />} />
        <Route path="/live" element={<CombinedLogsPlot />} />
        <Route path="/plot3" element={<PlotV3 />} />
      </Routes>
    </Router>
  );
}

export default AppWrapper;
