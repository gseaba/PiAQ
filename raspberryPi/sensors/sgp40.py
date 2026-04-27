import board
import busio
import adafruit_sgp40
import adafruit_sht31d
import math

class SGP40Sensor:
    def __init__(self):
        i2c = busio.I2C(board.SCL, board.SDA)
        self.sensor = adafruit_sgp40.SGP40(i2c)
        self.sht = adafruit_sht31d.SHT31D(i2c)

    def read(self):
        """Read VOC index using humidity compensation."""
        temperature = self.sht.temperature
        humidity = self.sht.relative_humidity

        voc_index = self.sensor.measure_index(
            temperature=temperature,
            relative_humidity=humidity
        )

        return {
            "voc_index": round(voc_index, 2),
            "voc_temperature_c": round(temperature, 2),
            "voc_humidity_percent": round(humidity, 2),
        }