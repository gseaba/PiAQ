import requests
import json

class DataUploader:
    def __init__(self, server_url, logger):
        self.server_url = server_url
        self.logger = logger

    def upload(self, data):
        """Upload sensor data to remote server."""
        try:
            response = requests.post(
                self.server_url,
                json=data,
                timeout=10
            )
            response.raise_for_status()
            self.logger.info(f"Upload successful: {response.status_code}")
            return True
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Upload failed: {e}")
            return False