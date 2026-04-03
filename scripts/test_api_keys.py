import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

async def test_keys():
    IQAIR_KEY = os.getenv("IQAIR_KEY")
    TOMTOM_KEY = os.getenv("TOMTOM_KEY")
    OPENWEATHER_KEY = os.getenv("OPENWEATHER_KEY")
    
    # Zone 4 (Chennai) coords
    lat, lon = 13.0125, 80.2241
    
    async with httpx.AsyncClient() as client:
        print("Testing OpenMeteo (Weather)...")
        url_weather = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
        try:
            res = await client.get(url_weather)
            print(f"OpenMeteo: {res.status_code}")
            if res.status_code == 200: print("✅ OpenMeteo working")
            else: print(f"❌ OpenMeteo failed: {res.text}")
        except Exception as e: print(f"❌ OpenMeteo exception: {e}")

        print("\nTesting IQAir (AQI)...")
        url_aqi = f"http://api.airvisual.com/v2/nearest_city?lat={lat}&lon={lon}&key={IQAIR_KEY}"
        try:
            res = await client.get(url_aqi)
            print(f"IQAir: {res.status_code}")
            if res.status_code == 200: print("✅ IQAir working")
            else: print(f"❌ IQAir failed: {res.text}")
        except Exception as e: print(f"❌ IQAir exception: {e}")

        print("\nTesting TomTom (Traffic)...")
        url_traffic = f"https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point={lat},{lon}&key={TOMTOM_KEY}"
        try:
            res = await client.get(url_traffic)
            print(f"TomTom: {res.status_code}")
            if res.status_code == 200: print("✅ TomTom working")
            else: print(f"❌ TomTom failed: {res.text}")
        except Exception as e: print(f"❌ TomTom exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_keys())
