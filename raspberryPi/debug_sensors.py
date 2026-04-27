import time
import board
import busio
from config import PMS5003_UART_PORT, PMS5003_BAUDRATE
from sensors import SCD40Sensor, SGP40Sensor, PMS5003Sensor

def debug_test():
    print("--- Air Quality Sensor Debug Tool ---")
    
    # 1. Initialize I2C and sensors
    try:
        i2c = busio.I2C(board.SCL, board.SDA)
        scd40 = SCD40Sensor(i2c)
        sgp40 = SGP40Sensor(i2c)
        pms5003 = PMS5003Sensor(PMS5003_UART_PORT, PMS5003_BAUDRATE)
        print("[SUCCESS] Sensors initialized.")
    except Exception as e:
        print(f"[ERROR] Failed to initialize hardware: {e}")
        return

    print("Warming up sensors (SCD40 takes ~5s to start)...")
    time.sleep(5)

    try:
        while True:
            print("\n" + "="*40)
            
            # 2. Test SCD40
            scd_data = scd40.read()
            if scd_data:
                print(f"[SCD40] CO2: {scd_data['co2']} ppm")
                print(f"[SCD40] Temp: {scd_data['temp']:.2f} °C")
                print(f"[SCD40] Hum:  {scd_data['hum']:.2f} %")
                
                # 3. Test SGP40 with logic check
                # Pass the data we just got from scd40
                voc_data = sgp40.read(temp=scd_data['temp'], hum=scd_data['hum'])
                print(f"[SGP40] VOC Index: {voc_data['voc_index']}")
            else:
                print("[SCD40] Waiting for data (data_ready is False)...")

            # 4. Test PMS5003
            pm_data = pms5003.read()
            if pm_data:
                print(f"[PMS] PM 1.0: {pm_data['pm1_0']} µg/m³")
                print(f"[PMS] PM 2.5: {pm_data['pm2_5']} µg/m³")
                print(f"[PMS] PM 10:  {pm_data['pm10']} µg/m³")
            else:
                print("[PMS] Error reading particulate matter data.")

            print("="*40)
            time.sleep(5)

    except KeyboardInterrupt:
        print("\nDebug stopped by user.")

if __name__ == "__main__":
    debug_test()