import React, { useState, useEffect } from "react";
import axios from "axios";
import Plot from "react-plotly.js";
import moment from "moment-timezone";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import LogDetails from "./LogDetails";

export default function PlotV3() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [startTime, setStartTime] = useState(
    moment().tz("Asia/Kolkata").subtract(24, "hours").format("YYYY-MM-DDTHH:mm")
  );
  const [endTime, setEndTime] = useState(
    moment().tz("Asia/Kolkata").format("YYYY-MM-DDTHH:mm")
  );
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
  const navigate = useNavigate();

  const fetchLogs = async () => {
    try {
      const startMoment = moment.tz(startTime, "Asia/Kolkata").utc();
      const endMoment = moment.tz(endTime, "Asia/Kolkata").utc();

      const response = await axios.get("/api/logs/", {
        params: {
          from: startMoment.toISOString(),
          to: endMoment.toISOString(),
          query,
        },
      });

      console.log("Fetched logs:", response.data);

      const data = response.data
        .map((log) => {
          // Ensure log.message is an object and process it accordingly
          const logData =
            typeof log.message === "string"
              ? JSON.parse(log.message.replace(/'/g, '"'))
              : log.message;
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
            : true; // If no levels are selected, include all logs
        });

      const aggregatedLogs = data.reduce((acc, log) => {
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

      setLogs(sortedLogs);
      setFilteredLogs(sortedLogs);
    } catch (error) {
      console.error("Failed to fetch logs", error);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [startTime, endTime, query, selectedLevels]);

  const handlePlotClick = async (event) => {
    const pointIndex = event.points[0].pointIndex;
    const selectedLog = filteredLogs[pointIndex];

    if (selectedLog) {
      const minute = moment(selectedLog.timestamp).format("YYYY-MM-DDTHH:mm");
      console.log("time sending ", minute);
      navigate(`/log/${minute}`);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    fetchLogs();
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
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-3xl mx-auto cursor-pointer">
          <Plot
            data={[
              {
                x: filteredLogs.map((log) =>
                  log.timestamp.tz("Asia/Kolkata").format("HH:mm")
                ),
                y: filteredLogs.map((log) => log.messageCount),
                type: "scatter",
                mode: "markers",
                marker: { size: 10, color: "#4A90E2", opacity: 0.8 },
                text: filteredLogs.map((log) => log._id),
              },
            ]}
            layout={{
              xaxis: {
                title: {
                  text: "Time (IST)",
                  font: {
                    size: 18,
                  },
                },
                tickformat: "%I:%M %p",
                showticklabels: true,
                showgrid: true,
                zeroline: true,
                zerolinecolor: "#000000",
                zerolinewidth: 2,
                range: ["00:00", "23:59"],
              },
              yaxis: {
                title: {
                  text: "Event Count",
                  font: {
                    size: 18,
                  },
                },
                showticklabels: true,
                showgrid: true,
                zeroline: true,
                zerolinecolor: "#000000",
                zerolinewidth: 2,
                linecolor: "#000000",
                linewidth: 2,
                range: [
                  0,
                  Math.max(...filteredLogs.map((log) => log.messageCount)) + 10,
                ],
              },
              margin: {
                l: 50,
                r: 50,
                b: 50,
                t: 50,
              },
            }}
            onClick={handlePlotClick}
          />
        </div>
      ) : (
        <p className="text-center text-gray-600 text-lg">No logs available</p>
      )}
    </div>
  );
}
