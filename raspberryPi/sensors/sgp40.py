import adafruit_sgp40

class SGP40Sensor:
    def __init__(self, i2c):
        """Initializes the SGP40 on the provided I2C bus."""
        self.sensor = adafruit_sgp40.SGP40(i2c)

    def read(self, temp, hum):
        """Read VOC index using humidity compensation."""

        voc_index = self.sensor.measure_index(
            temperature=temp,
            relative_humidity=hum
        )

        return {
            "voc_index": round(voc_index, 2)
        }