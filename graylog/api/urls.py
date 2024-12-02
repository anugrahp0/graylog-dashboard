

from django.urls import path
from .views import GraylogWebhookView, GraylogLogsViewSet

urlpatterns = [
    path('', GraylogWebhookView.as_view(), name='graylog-webhook'),
     path('api/graylog-logs/', GraylogLogsViewSet.as_view(), name='graylog_logs_api'),
    path('api/graylog-logs/specific-time/', GraylogLogsViewSet.as_view({'get': 'get_log'}), name='graylog-logs-specific-time'),   
]
