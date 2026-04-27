import time
import board
import busio
import adafruit_scd30

class SCD30Sensor:
    def __init__(self):
        i2c = busio.I2C(board.SCL, board.SDA)
        self.sensor = adafruit_scd30.SCD30(i2c)

    def read(self):
        """Read CO₂, temperature, and humidity."""
        if self.sensor.data_available:
            return {
                "co2_ppm": round(self.sensor.CO2, 2),
                "temperature_c": round(self.sensor.temperature, 2),
                "humidity_percent": round(self.sensor.relative_humidity, 2),
            }
        else:
            time.sleep(1)
            return None