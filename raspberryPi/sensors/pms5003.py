from adafruit_pm25.uart import PM25_UART
import serial

class PMS5003Sensor:
    def __init__(self, port, baudrate):
        # Increased timeout slightly to ensure we don't drop frames
        uart = serial.Serial(port, baudrate, timeout=1.5)
        self.sensor = PM25_UART(uart, reset_pin=None)

    def read(self):
        """Read particulate matter concentrations (Atmospheric/Env)."""
        try:
            data = self.sensor.read()
            if not data:
                return None

            # Mapping to the keys your backend expects
            return {
                "pm1_0": data["pm10 env"],   # 1.0 micron
                "pm2_5": data["pm25 env"],   # 2.5 micron
                "pm10":  data["pm100 env"]   # 10.0 micron
            }
        except (RuntimeError, Exception) as e:
            # RuntimeError often happens on checksum failure; just try again next loop
            print(f"Error: {e}")
            return None