import React, { useState, useEffect } from "react";
import Plot from "react-plotly.js";
import moment from "moment-timezone";
import { Route, Routes, useNavigate } from "react-router-dom";
import LogDetails from "./LogDetails";

function App() {
  const [logs, setLogs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize the WebSocket connection
    const socket = new WebSocket("ws://localhost:8000/ws/graylog-logs/");

    socket.onopen = () => {
      console.log("WebSocket connection established");

      // Request logs for the last hour
      socket.send(
        JSON.stringify({
          from: moment()
            .tz("Asia/Kolkata")
            .subtract(1, "hours")
            .utc()
            .toISOString(),
          to: moment().tz("Asia/Kolkata").utc().toISOString(),
        })
      );
    };

    socket.onmessage = (event) => {
      const log = JSON.parse(event.data);
      console.log("Received log:", log);

      // Add the received log to the logs state
      setLogs((prevLogs) => [...prevLogs, log]);
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = (event) => {
      console.log("WebSocket connection closed:", event);
    };

    // Clean up the WebSocket connection on component unmount
    return () => {
      socket.close();
    };
  }, []);

  const handlePlotClick = (event) => {
    const pointIndex = event.points[0].pointIndex;
    const selectedLog = logs[pointIndex];

    if (selectedLog) {
      const minute = moment(selectedLog.timestamp).format("YYYY-MM-DDTHH:mm");
      console.log("time sending ", minute);
      navigate(`/log/${minute}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold mb-8 text-center text-blue-800">
        Graylog Logs Scatter Plot
      </h1>

      {logs.length > 0 ? (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <Plot
            data={[
              {
                x: logs.map((log) => new Date(log.timestamp)),
                y: logs.map((log) => 1), // Each log counts as 1
                mode: "markers",
                type: "scatter",
                marker: { color: "blue", size: 10 },
                text: logs.map((log) => log.short_message),
                hoverinfo: "text",
              },
            ]}
            layout={{
              xaxis: {
                title: "Time",
                rangemode: "tozero",
              },
              yaxis: {
                title: "Event Count",
                rangemode: "tozero",
              },
              title: {
                text: "Events over Time",
                font: { size: 24 },
              },
            }}
            onClick={handlePlotClick}
          />
        </div>
      ) : (
        <p className="text-center text-gray-700">No logs available</p>
      )}
    </div>
  );
}

export default App;
