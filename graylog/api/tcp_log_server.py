from datetime import datetime, timedelta
import json
import socket
import threading
from django.core.management.base import BaseCommand
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class TCPLogServer:
    def __init__(self, host='0.0.0.0', port=9000):
        self.host = host
        self.port = port
        self.logs = []  # List to store logs with timestamps

    def start(self):
        server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server_socket.bind((self.host, self.port))
        server_socket.listen(5)
        print(f"TCP Log Server started on {self.host}:{self.port}")

        while True:
            client_socket, addr = server_socket.accept()
            print(f"Connection from {addr}")
            
            # Read data from the client in a loop
            data_buffer = ""
            while True:
                data = client_socket.recv(1024)
                if not data:
                    break  # Client has closed the connection
                
                data_buffer += data.decode('utf-8')

            # Process accumulated data
            if data_buffer:
                self.handle_log(data_buffer)
            client_socket.close()

    def handle_log(self, log_data):
        try:
            log_data = log_data.rstrip('\x00')
            logs = json.loads(log_data)
            if not isinstance(logs, list):  # Ensure logs are in array format
                logs = [logs]

            timestamped_logs = {
                'timestamp': datetime.now(),
                'logs': logs
            }
            self.logs.extend(logs)  # Store multiple logs
            print("Received logs:", logs)

            # Send the logs to WebSocket clients
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "logs_group", {
                    "type": "send_logs",
                    "logs": logs  # Send all logs as an array
                }
            )
        except json.JSONDecodeError:
            print("Invalid JSON received")

    def get_logs_last_hour(self):
        one_hour_ago = datetime.now() - timedelta(hours=1)
        recent_logs = [log for log in self.logs if log['timestamp'] > one_hour_ago]
        return recent_logs

# Create a new management command to start the TCP server
class Command(BaseCommand):
    help = 'Start the TCP log server'

    def handle(self, *args, **kwargs):
        server = TCPLogServer()
        # Start the server in a separate thread
        thread = threading.Thread(target=server.start)
        thread.daemon = True
        thread.start()

        print("TCP Log Server is now running alongside Django...")

        # Example of querying logs from the last hour
        recent_logs = server.get_logs_last_hour()
        print("Logs from the last hour:", recent_logs)
