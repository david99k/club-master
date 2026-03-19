'use client';

import { useCallback, useRef } from 'react';

interface GeocodedResult {
  readonly lat: number;
  readonly lng: number;
}

export function useGeocode() {
  const geocoderRef = useRef<kakao.maps.services.Geocoder | null>(null);

  const geocode = useCallback((address: string): Promise<GeocodedResult | null> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.kakao?.maps) {
        resolve(null);
        return;
      }

      window.kakao.maps.load(() => {
        if (!geocoderRef.current) {
          geocoderRef.current = new kakao.maps.services.Geocoder();
        }

        geocoderRef.current.addressSearch(address, (result, status) => {
          if (status === kakao.maps.services.Status.OK && result.length > 0) {
            resolve({
              lat: parseFloat(result[0].y),
              lng: parseFloat(result[0].x),
            });
          } else {
            resolve(null);
          }
        });
      });
    });
  }, []);

  return { geocode };
}
