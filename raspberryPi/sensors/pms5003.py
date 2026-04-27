from adafruit_pm25.uart import PM25_UART
import serial

class PMS5003Sensor:
    def __init__(self, port, baudrate):
        uart = serial.Serial(port, baudrate, timeout=1)
        self.sensor = PM25_UART(uart, reset_pin=None)

    def read(self):
        """Read particulate matter concentrations."""
        try:
            data = self.sensor.read()
            if data is None:
                return None

            return {
                "pm1_0": data["pm10 standard"],
                "pm2_5": data["pm25 standard"],
                "pm10": data["pm100 standard"],
            }
        except RuntimeError:
            return None