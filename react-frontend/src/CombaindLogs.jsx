import React, { useState, useEffect } from "react";
import axios from "axios";
import Plot from "react-plotly.js";
import moment from "moment-timezone";
import { useNavigate } from "react-router-dom";

export default function CombinedLogsPlot() {
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

  // Fetch initial logs from API
  const fetchLogs = async () => {
    try {
      const startMoment = moment.tz(startTime, "Asia/Kolkata").utc();
      const endMoment = moment.tz(endTime, "Asia/Kolkata").utc();

      const response = await axios.get("/api/graylog-logs/", {
        params: {
          from: startMoment.toISOString(),
          to: endMoment.toISOString(),
          query,
        },
      });

      console.log("Fetched logs:", response.data);

      const data = response.data
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

  useEffect(() => {
    // Initialize WebSocket connection for real-time logs
    const socket = new WebSocket("ws://localhost:8000/ws/graylog-logs/");

    socket.onopen = () => {
      console.log("WebSocket connection established");

      // Request logs for the last hour from WebSocket
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

      // Convert the timestamp from UNIX seconds to milliseconds and parse it as a moment object
      if (log.timestamp && typeof log.timestamp === "number") {
        log.timestamp = moment.unix(log.timestamp);
      } else if (log.timestamp && typeof log.timestamp === "string") {
        log.timestamp = moment.utc(log.timestamp);
      }

      // Aggregating the log similar to the API-fetched logs
      const timeKey = log.timestamp.format("YYYY-MM-DDTHH:mm");
      console.log("Log time is :: ", timeKey);

      const newLog = {
        ...log,
        messageCount: 1,
      };

      setFilteredLogs((prevLogs) => {
        // Find if the log for this timeKey already exists
        const existingLog = prevLogs.find(
          (prevLog) => prevLog.timestamp.format("YYYY-MM-DDTHH:mm") === timeKey
        );

        if (existingLog) {
          // Update message count for existing log
          return prevLogs.map((prevLog) =>
            prevLog.timestamp.format("YYYY-MM-DDTHH:mm") === timeKey
              ? { ...prevLog, messageCount: prevLog.messageCount + 1 }
              : prevLog
          );
        } else {
          // Add the new log if it doesn't exist
          return [...prevLogs, newLog];
        }
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
  }, []);

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
                x: filteredLogs.map((log) => {
                  const timestamp = moment.isMoment(log.timestamp)
                    ? log.timestamp
                    : moment(log.timestamp);
                  return timestamp.tz("Asia/Kolkata").format("HH:mm");
                }),
                y: filteredLogs.map((log) => log.messageCount),
                type: "scatter",
                mode: "markers",
                marker: {
                  size: 10,
                  color: filteredLogs.map((log) => {
                    // Use red for errors and blue for other logs
                    return log.level === levelMap.Error ? "#FF0000" : "#4A90E2";
                  }),
                  opacity: 0.8,
                },
                text: filteredLogs.map(
                  (log) =>
                    `Time: ${moment(log.timestamp)
                      .tz("Asia/Kolkata")
                      .format("HH:mm")}<br>Message Count: ${log.messageCount}`
                ),
                hoverinfo: "text", // Ensures that only the text information is displayed
                hovertemplate: "%{text}<extra></extra>", // Customizes the hover template to show only the text
              },
            ]}
            layout={{
              xaxis: {
                title: {
                  text: "Time (IST)",
                  font: { size: 18 },
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
                  font: { size: 18 },
                },
                showticklabels: true,
                showgrid: true,
                zeroline: true,
                zerolinecolor: "#000000",
                zerolinewidth: 2,
                linecolor: "#000000",
                linewidth: 2,
              },
              margin: { l: 60, r: 50, t: 40, b: 60 },
              autosize: true,
              showlegend: false,
              paper_bgcolor: "#ffffff",
              plot_bgcolor: "#f5f5f5",
            }}
            onClick={handlePlotClick}
          />
        </div>
      ) : (
        <div className="flex justify-center items-center text-red-600">
          No data available for the selected filters.
        </div>
      )}
    </div>
  );
}