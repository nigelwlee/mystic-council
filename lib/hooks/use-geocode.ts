"use client";

import { useState, useEffect } from "react";

interface GeocodeResult {
  lat: number;
  lon: number;
}

export function useGeocode(location: string, defaultLocation?: string) {
  const [geocoding, setGeocoding] = useState(false);
  const [coords, setCoords] = useState<GeocodeResult | null>(null);

  useEffect(() => {
    if (!location.trim() || location === defaultLocation) return;
    const id = setTimeout(async () => {
      setGeocoding(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location)}`,
          { headers: { "Accept-Language": "en" } },
        );
        const data = (await res.json()) as { lat: string; lon: string }[];
        if (data[0]) {
          setCoords({
            lat: parseFloat(parseFloat(data[0].lat).toFixed(4)),
            lon: parseFloat(parseFloat(data[0].lon).toFixed(4)),
          });
        }
      } catch {
        // ignore
      } finally {
        setGeocoding(false);
      }
    }, 800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  return { geocoding, coords };
}
