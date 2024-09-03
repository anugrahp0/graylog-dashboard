# serializers.py
from rest_framework import serializers

class LogSerializer(serializers.Serializer):
    message = serializers.CharField()
