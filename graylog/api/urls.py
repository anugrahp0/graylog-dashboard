# urls.py
from django.urls import path
from .views import GraylogLogsView

urlpatterns = [
    path('api/graylog-logs/', GraylogLogsView.as_view(), name='graylog_logs_api'),
    path('api/graylog-logs/specific-time/', GraylogLogsView.as_view({'get': 'get_log'}), name='graylog-logs-specific-time'),   
]
