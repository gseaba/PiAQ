import time
import adafruit_scd4x

class SCD40Sensor:
    def __init__(self, i2c):
        """Initializes the SCD40 on the provided I2C bus."""
        self.sensor = adafruit_scd4x.SCD4X(i2c)
        
        # This is vital; the sensor won't update without it
        self.sensor.start_periodic_measurement()
    def read(self):
        """Read CO₂, temperature, and humidity."""
        # The SCD4x library uses .data_ready instead of .data_available
        if self.sensor.data_ready:
            return {
                "co2": self.sensor.CO2,
                "temp": round(self.sensor.temperature, 2),
                "hum": round(self.sensor.relative_humidity, 2),
            }
        else:
            # Data isn't ready yet (SCD40 typically updates every 5 seconds)
            return None

    def stop(self):
        """Optional: Stop measurements to save power."""
        self.sensor.stop_periodic_measurement()