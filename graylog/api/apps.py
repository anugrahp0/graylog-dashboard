from django.apps import AppConfig
import threading

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    def ready(self):
        from .tcp_log_server import TCPLogServer

        # Start TCP Server in a new thread
        tcp_server = TCPLogServer()
        thread = threading.Thread(target=tcp_server.start)
        thread.daemon = True
        thread.start()

        print("TCP Log Server started from MyAppConfig...")