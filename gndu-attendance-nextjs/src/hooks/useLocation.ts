'use client';

import { useState, useEffect } from 'react';
import { GNDU_COORDINATES, MAX_DISTANCE_METERS, LocationCoords } from '@/types';

interface LocationState {
  status: 'checking' | 'allowed' | 'denied' | 'error';
  message: string;
  distance?: number;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

export function useLocation() {
  const [locationState, setLocationState] = useState<LocationState>({
    status: 'checking',
    message: '📍 Checking your location...'
  });

  const checkLocation = async () => {
    setLocationState({
      status: 'checking',
      message: '📍 Checking your location...'
    });

    if (!navigator.geolocation) {
      setLocationState({
        status: 'error',
        message: '❌ Geolocation is not supported by this browser'
      });
      return;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;
      const distance = calculateDistance(
        latitude,
        longitude,
        GNDU_COORDINATES.latitude,
        GNDU_COORDINATES.longitude
      );

      if (distance <= MAX_DISTANCE_METERS) {
        setLocationState({
          status: 'allowed',
          message: `✅ Location verified! You are ${Math.round(distance)}m from campus`,
          distance
        });
      } else {
        setLocationState({
          status: 'denied',
          message: `❌ You must be within ${MAX_DISTANCE_METERS}m of GNDU campus to mark attendance. Current distance: ${Math.round(distance)}m`,
          distance
        });
      }
    } catch (error: any) {
      let message = '❌ Location access denied';
      
      if (error.code === 1) {
        message = '❌ Location access denied. Please allow location access and try again.';
      } else if (error.code === 2) {
        message = '❌ Location unavailable. Please check your GPS and try again.';
      } else if (error.code === 3) {
        message = '❌ Location request timed out. Please try again.';
      }

      setLocationState({
        status: 'denied',
        message
      });
    }
  };

  useEffect(() => {
    checkLocation();
  }, []);

  return {
    ...locationState,
    checkLocation
  };
}