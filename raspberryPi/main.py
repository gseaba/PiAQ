import time
from datetime import datetime, timezone

from config import (
    SERVER_URL,
    UPLOAD_INTERVAL,
    PMS5003_UART_PORT,
    PMS5003_BAUDRATE,
)
from sensors.scd30 import SCD30Sensor
from sensors.pms5003 import PMS5003Sensor
from sensors.sgp40 import SGP40Sensor
from uploader.uploader import DataUploader
from utils.logger import setup_logger


def collect_data(scd30, pms5003, sgp40):
    """Collect data from all sensors."""
    data = {
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    scd_data = scd30.read()
    if scd_data:
        data.update(scd_data)

    pm_data = pms5003.read()
    if pm_data:
        data.update(pm_data)

    voc_data = sgp40.read()
    if voc_data:
        data.update(voc_data)

    return data


def main():
    logger = setup_logger()
    logger.info("Starting Environmental Monitor")

    # Initialize sensors
    scd30 = SCD30Sensor()
    pms5003 = PMS5003Sensor(
        PMS5003_UART_PORT,
        PMS5003_BAUDRATE
    )
    sgp40 = SGP40Sensor()

    # Initialize uploader
    uploader = DataUploader(SERVER_URL, logger)

    while True:
        try:
            data = collect_data(scd30, pms5003, sgp40)
            logger.info(f"Collected data: {data}")
            uploader.upload(data)

        except Exception as e:
            logger.exception(f"Unexpected error: {e}")

        time.sleep(UPLOAD_INTERVAL)


if __name__ == "__main__":
    main()