import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    if (!lat || !lon) {
      return NextResponse.json({ error: "Missing lat/lon" }, { status: 400 });
    }

    // Call Open-Meteo for free weather data (no API key required)
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    );
    const weatherData = await weatherRes.json();

    // Call Nominatim for Reverse Geocoding (City name)
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      { headers: { 'User-Agent': 'tJournal-App/1.0' } }
    );
    const geoData = await geoRes.json();

    const city = geoData.address?.city || geoData.address?.town || geoData.address?.village || geoData.name || "Unknown Location";
    const temp = weatherData.current_weather?.temperature;
    
    // WMO Weather interpretation codes (simplified)
    const code = weatherData.current_weather?.weathercode;
    let condition = "Clear";
    if (code === 1 || code === 2 || code === 3) condition = "Cloudy";
    if (code >= 45 && code <= 48) condition = "Foggy";
    if (code >= 51 && code <= 67) condition = "Raining";
    if (code >= 71 && code <= 77) condition = "Snowing";
    if (code >= 80 && code <= 82) condition = "Heavy Rain";
    if (code >= 95) condition = "Thunderstorm";

    return NextResponse.json({
      city,
      temp: `${Math.round(temp)}°C`,
      condition
    });
  } catch (error: any) {
    console.error("Weather API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
