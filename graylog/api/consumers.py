# consumers.py

from channels.generic.websocket import AsyncWebsocketConsumer
import json

class GraylogLogsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Join the "logs_group" group
        await self.channel_layer.group_add(
            "logs_group",
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave the "logs_group" group
        await self.channel_layer.group_discard(
            "logs_group",
            self.channel_name
        )

    async def receive(self, text_data):
        # Handle incoming messages if needed
        pass

    async def send_logs(self, event):
        # Send log data to WebSocket
        logs = event['logs']
        await self.send(text_data=json.dumps(logs))
