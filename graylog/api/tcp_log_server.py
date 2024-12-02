from datetime import datetime
import socket
import threading
import json
from django.core.management.base import BaseCommand
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class TCPLogServer:
    def __init__(self, host='0.0.0.0', port=9000):
        self.host = host
        self.port = port
        self.logs = []  # Initialize the logs list

    def start(self):
        server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server_socket.bind((self.host, self.port))
        server_socket.listen(5)
        print(f"TCP Log Server started on {self.host}:{self.port}")

        while True:
            client_socket, addr = server_socket.accept()
            print(f"Connection from {addr}")
            data = client_socket.recv(1024)
            if data:
                data = data.decode('utf-8').rstrip('\x00')  # Remove null terminator
                self.handle_log(data)
            client_socket.close()

    def handle_log(self, log_data):
        try:
            # Parse the JSON data
            logs = json.loads(log_data)

            # Add timestamp to logs
            timestamped_logs = {
                'timestamp': datetime.now().isoformat(),  # ISO format for consistency
                'logs': logs
            }
            self.logs.append(timestamped_logs)
            # Send the logs to WebSocket clients
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "logs_group", {
                    "type": "send_logs",
                    "logs": logs
                }
            )
        except json.JSONDecodeError as e:
            print(f"Invalid JSON received: {e}")

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
