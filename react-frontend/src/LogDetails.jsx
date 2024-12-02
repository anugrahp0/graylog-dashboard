import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import moment from "moment-timezone";

const LOG_LEVELS = {
  0: "Emergency",
  1: "Alert",
  2: "Critical",
  3: "Error",
  4: "Warning",
  5: "Notice",
  6: "Informational",
  7: "Debug",
};

function LogDetails() {
  const { time } = useParams();
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [selectedLevels, setSelectedLevels] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // Verify if the time parameter is received correctly
        console.log("Original Time Parameter:", time);

        // Convert the time parameter to UTC format
        const utcTime = moment.tz(time, "Asia/Kolkata").utc().toISOString();
        console.log("Converted UTC Time:", utcTime);

        const response = await axios.get(`/api/graylog-logs/specific_time/`, {
          params: { time: utcTime },
        });

        const data = response.data.map((log) => {
          let parsedMessage;
          try {
            parsedMessage = JSON.parse(log.message.replace(/'/g, '"'));
          } catch (parseError) {
            console.error("Failed to parse log message:", log.message);
            parsedMessage = { error: "Failed to parse message" };
          }

          return {
            ...log,
            timestamp: moment.utc(log.timestamp),
            parsedMessage,
            level: parsedMessage.level || log.level, // Ensure level is assigned correctly
          };
        });

        console.log("Fetched Data:", data); // Check the fetched data
        setLogs(data);
      } catch (error) {
        console.error("Failed to fetch logs", error);
        setError("Failed to fetch logs. Please try again later.");
      }
    };

    fetchLogs();
  }, [time]);

  const handleLevelChange = (level) => {
    setSelectedLevels((prevLevels) =>
      prevLevels.includes(level)
        ? prevLevels.filter((l) => l !== level)
        : [...prevLevels, level]
    );
  };

  const filteredLogs = logs.filter(
    (log) => selectedLevels.length === 0 || selectedLevels.includes(log.level)
  );

  console.log("Filtered Logs:", filteredLogs);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold mb-8 text-center text-blue-800">
        Log Details
      </h1>

      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">Filter by Log Level:</h2>
        <div className="flex justify-center flex-wrap gap-2">
          {Object.entries(LOG_LEVELS).map(([level, label]) => (
            <button
              key={level}
              className={`px-4 py-2 border rounded ${
                selectedLevels.includes(parseInt(level))
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200"
              }`}
              onClick={() => handleLevelChange(parseInt(level))}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-center text-red-600 text-lg">{error}</p>
      ) : filteredLogs.length > 0 ? (
        <div className="bg-white shadow-lg rounded-lg p-6 max-w-3xl mx-auto">
          <ul>
            {filteredLogs.map((log, index) => (
              <li key={index} className="mb-4 border-b border-gray-300 pb-2">
                <p>
                  <strong>Level:</strong> {LOG_LEVELS[log.level]}
                </p>
                <p>
                  <strong>Source:</strong> {log.parsedMessage.source || "N/A"}
                </p>
                <p>
                  <strong>Message:</strong> {log.parsedMessage.message || "N/A"}
                </p>
                <p>
                  <strong>File:</strong> {log.parsedMessage.file || "N/A"}
                </p>
                <p>
                  <strong>Function:</strong>{" "}
                  {log.parsedMessage.function || "N/A"}
                </p>
                <p>
                  <strong>Line:</strong> {log.parsedMessage.line || "N/A"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-center text-gray-600 text-lg">No logs available</p>
      )}
    </div>
  );
}

export default LogDetails;
