# sidecars/sniffer.py
import sys
import time
import json
import random

MOCK_APS = [
    {"ssid": "Target_AP_Secure", "bssid": "C4:AD:34:D1:F2:A0", "channel": 1, "encryption": "WPA3", "rssi": -48},
    {"ssid": "Staff_Net_5G", "bssid": "70:85:C2:5D:89:12", "channel": 36, "encryption": "WPA2-Enterprise", "rssi": -62},
    {"ssid": "Guest_Free_WiFi", "bssid": "00:1A:2B:3C:4D:5E", "channel": 6, "encryption": "Open", "rssi": -75},
]

def main():
    while True:
        ap = random.choice(MOCK_APS)
        ap_event = {
            "type": "BeaconDetected",
            "payload": {
                **ap,
                "rssi": ap["rssi"] + random.randint(-5, 5)
            }
        }
        sys.stdout.write(json.dumps(ap_event) + "\n")
        sys.stdout.flush()
        time.sleep(1.5)

if __name__ == "__main__":
    main()
