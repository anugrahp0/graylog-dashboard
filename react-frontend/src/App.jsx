import React, { useState, useEffect } from "react";
import Plot from "react-plotly.js";
import moment from "moment-timezone";
import { Route, Routes, useNavigate } from "react-router-dom";
import LogDetails from "./LogDetails";

function App() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [startTime, setStartTime] = useState(
    moment().tz("Asia/Kolkata").subtract(1, "hours").format("YYYY-MM-DDTHH:mm")
  );
  const [endTime, setEndTime] = useState(
    moment().tz("Asia/Kolkata").format("YYYY-MM-DDTHH:mm")
  );
  var mylogs = [];
  const [query, setQuery] = useState("");
  const [selectedLevels, setSelectedLevels] = useState([]);
  const levelMap = {
    Emergency: 0,
    Alert: 1,
    Critical: 2,
    Error: 3,
    Warning: 4,
    Notice: 5,
    Informational: 6,
    Debug: 7,
  };

  const navigate = useNavigate(); // This should work now

  useEffect(() => {
    // Initialize the WebSocket connection
    const socket = new WebSocket("ws://192.168.0.109:8000/ws/graylog-logs/");

    socket.onopen = () => {
      console.log("WebSocket connection established");

      // Request logs for the last hour
      socket.send(
        JSON.stringify({
          from: moment.tz(startTime, "Asia/Kolkata").utc().toISOString(),
          to: moment.tz(endTime, "Asia/Kolkata").utc().toISOString(),
          query,
        })
      );
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("Received logs:", data);
      mylogs.push(data);
      const startMoment = moment.tz(startTime, "Asia/Kolkata").utc();
      const endMoment = moment.tz(endTime, "Asia/Kolkata").utc();

      const newLogs = data
        .map((log) => {
          const logData = JSON.parse(log.message.replace(/'/g, '"'));
          logData.timestamp = moment.utc(logData.timestamp);
          logData.messageCount = 1;
          return logData;
        })
        .filter((log) => {
          return log.timestamp.isBetween(startMoment, endMoment);
        })
        .filter((log) => {
          return selectedLevels.length > 0
            ? selectedLevels.includes(log.level)
            : true;
        });

      const aggregatedLogs = newLogs.reduce((acc, log) => {
        const timeKey = log.timestamp.format("YYYY-MM-DDTHH:mm");
        if (!acc[timeKey]) {
          acc[timeKey] = { ...log, messageCount: 0 };
        }
        acc[timeKey].messageCount += 1;
        return acc;
      }, {});

      const sortedLogs = Object.values(aggregatedLogs).sort(
        (a, b) => a.timestamp - b.timestamp
      );

      // Update logs with new and existing logs
      setLogs((prevLogs) => {
        const updatedLogs = [...prevLogs, ...sortedLogs];
        return updatedLogs.sort((a, b) => a.timestamp - b.timestamp);
      });
      setFilteredLogs((prevFilteredLogs) => {
        const updatedFilteredLogs = [...prevFilteredLogs, ...sortedLogs];
        return updatedFilteredLogs.sort((a, b) => a.timestamp - b.timestamp);
      });
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
  }, [startTime, endTime, query, selectedLevels]);

  const handlePlotClick = async (event) => {
    const pointIndex = event.points[0].pointIndex;
    const selectedLog = filteredLogs[pointIndex];

    if (selectedLog) {
      const minute = selectedLog.timestamp.format("YYYY-MM-DDTHH:mm");
      navigate(`/log/${minute}`);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    // Send filter data to server through WebSocket
    const socket = new WebSocket("ws://192.168.0.109:8000/ws/graylog-logs/");
    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          from: moment.tz(startTime, "Asia/Kolkata").utc().toISOString(),
          to: moment.tz(endTime, "Asia/Kolkata").utc().toISOString(),
          query,
        })
      );
    };
  };

  const handleLevelChange = (level) => {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    );
  };

  const handleAllLevelsChange = () => {
    setSelectedLevels([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold mb-8 text-center text-blue-800">
        Graylog Logs Scatter Plot
      </h1>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col items-center space-y-4 mb-8"
      >
        <div className="flex justify-center items-center space-x-4">
          <label className="flex flex-col space-y-2">
            <span className="text-gray-700">Start Time (IST):</span>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </label>

          <label className="flex flex-col space-y-2">
            <span className="text-gray-700">End Time (IST):</span>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
        </div>

        <input
          type="text"
          placeholder="Search query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />

        <div className="flex justify-center items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedLevels.length === 0}
              onChange={handleAllLevelsChange}
              className="text-blue-600"
            />
            <span className="text-gray-700">All/Reset</span>
          </label>

          {Object.keys(levelMap).map((level) => (
            <label key={level} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedLevels.includes(levelMap[level])}
                onChange={() => handleLevelChange(levelMap[level])}
                className="text-blue-600"
              />
              <span className="text-gray-700">{level}</span>
            </label>
          ))}
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go
        </button>
      </form>

      {filteredLogs.length > 0 ? (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <Plot
            data={[
              {
                x: filteredLogs.map((log) => log.timestamp.toDate()),
                y: filteredLogs.map((log) => log.messageCount),
                mode: "markers",
                type: "scatter",
                marker: { color: "blue", size: 10 },
                text: filteredLogs.map((log) => log.message),
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

      <Routes>
        <Route path="/log/:minute" element={<LogDetails />} />
      </Routes>
    </div>
  );
}

export default App;
