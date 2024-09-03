import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import App from './App';
import LogDetails from './LogDetails';

function AppWrapper() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/log/:id" element={<LogDetails />} />
      </Routes>
    </Router>
  );
}

export default AppWrapper;
