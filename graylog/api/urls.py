

from django.urls import path
from .views import GraylogWebhookView

urlpatterns = [
    path('', GraylogWebhookView.as_view(), name='graylog-webhook'),
]
