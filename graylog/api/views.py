from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action
from django.conf import settings
from .serializers import LogSerializer
from datetime import datetime, timedelta, timezone
import requests

# views.py

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.views import View
import json
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class GraylogWebhookView(View):
    @method_decorator(csrf_exempt)
    def post(self, request, *args, **kwargs):
        try:
            logs = json.loads(request.body)
            
            # Forward logs to WebSocket clients
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "logs_group", {
                    "type": "send_logs",
                    "logs": logs
                }
            )

            return JsonResponse({'status': 'success'})
        except json.JSONDecodeError:
            return JsonResponse({'status': 'error', 'message': 'Invalid JSON'}, status=400)

























class GraylogLogsViewSet(viewsets.ViewSet):
    def list(self, request):
        graylog_url = 'http://192.168.109.130:9000/api/search/universal/absolute'
        auth = (settings.GRAYLOG_API_USER, settings.GRAYLOG_API_PASSWORD)

        # Retrieve query parameters for date range
        from_str = request.query_params.get('from', None)
        to_str = request.query_params.get('to', None)

        if not from_str or not to_str:
            to_time = datetime.now(timezone.utc)
            from_time = to_time - timedelta(hours=2)
        else:
            try:
                from_time = datetime.fromisoformat(from_str).astimezone(timezone.utc)
                to_time = datetime.fromisoformat(to_str).astimezone(timezone.utc)
            except ValueError:
                return Response({'error': 'Invalid time format. Please use ISO 8601 format.'}, status=status.HTTP_400_BAD_REQUEST)

        # Retrieve the 'query' parameter
        query = request.query_params.get('query') 
        

        params = {
            'query': query if query else "*",
            'from': from_time.isoformat(timespec='milliseconds'),
            'to': to_time.isoformat(timespec='milliseconds'),
            'limit': 1000,
            'filter': 'streams:000000000000000000000001',  # Stream ID (replace with actual stream ID)
            'fields': 'message,timestamp,source,level',  # Specify the fields you want to return
        }

        headers = {
            "Accept": "application/json",
        }

        try:
            response = requests.get(graylog_url, auth=auth, params=params, headers=headers)
            response.raise_for_status()  # Raises HTTPError for bad responses (4xx or 5xx)
        except requests.exceptions.RequestException as e:
            return Response({'error': f'Error fetching logs from Graylog: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if response.status_code == 200:
            try:
                logs = response.json().get('messages', [])
                serialized_logs = LogSerializer(logs, many=True).data
                return Response(serialized_logs, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({'error': f'Error serializing logs: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response({'error': f'Failed to fetch logs: {response.status_code} - {response.text}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def specific_time(self, request):
        specific_time_str = request.query_params.get('time', None)

        if not specific_time_str:
            return Response({'error': 'Time parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Parse ISO 8601 format
            specific_time = datetime.fromisoformat(specific_time_str).astimezone(timezone.utc)
        except ValueError:
            return Response({'error': 'Invalid time format. Please use ISO 8601 format.'}, status=status.HTTP_400_BAD_REQUEST)

        start_time = specific_time.replace(second=0, microsecond=0)
        end_time = start_time + timedelta(minutes=1)
        print(f"Start time ::  {start_time}")
        graylog_url = 'http://192.168.109.130:9000/api/search/universal/absolute'
        auth = (settings.GRAYLOG_API_USER, settings.GRAYLOG_API_PASSWORD)

        params = {
            'query':"*",
            'from': start_time.isoformat(timespec='milliseconds'),
            'to': end_time.isoformat(timespec='milliseconds'),
            'limit': 150,
            'filter': 'streams:000000000000000000000001',  # Stream ID (replace with actual stream ID)
            'fields': 'message,timestamp,source,level',
        }

        headers = {
            "Accept": "application/json",
        }

        try:
            response = requests.get(graylog_url, auth=auth, params=params, headers=headers)
            response.raise_for_status()  # Raises HTTPError for bad responses (4xx or 5xx)
        except requests.exceptions.RequestException as e:
            return Response({'error': f'Error fetching logs from Graylog: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        if response.status_code == 200:
            try:
                logs = response.json().get('messages', [])
                serialized_logs = LogSerializer(logs, many=True).data
                return Response(serialized_logs, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({'error': f'Error serializing logs: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response({'error': f'Failed to fetch logs: {response.status_code} - {response.text}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
