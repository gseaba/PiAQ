import serial

ser = serial.Serial("/dev/serial0", 9600, timeout=2)

while True:
    data = ser.read(32)
    if data:
        print(data)