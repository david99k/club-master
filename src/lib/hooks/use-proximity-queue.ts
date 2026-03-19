'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/auth';
import { useClubStore } from '@/store/club';
import { useQueueStore } from '@/store/queue';
import { distanceInMeters } from './use-user-location';
import type { ClubLocation } from '@/types';

const PROXIMITY_RADIUS_M = 200;
const CHECK_INTERVAL_MS = 30000; // 30초마다 위치 체크

/**
 * 사용자가 클럽 활동 장소 근처(200m)에 있으면 자동으로 온라인 상태를 유지합니다.
 * 위치 정보를 서버에 업데이트하여 다른 사용자들이 근처에 있음을 알 수 있게 합니다.
 */
export function useProximityQueue() {
  const { member } = useAuthStore();
  const { activeClub } = useClubStore();
  const { entries } = useQueueStore();
  const locationsRef = useRef<ClubLocation[]>([]);
  const wasNearbyRef = useRef(false);

  // 클럽 장소 로드
  useEffect(() => {
    if (!activeClub) {
      locationsRef.current = [];
      return;
    }

    const supabase = createClient();
    supabase
      .from('club_locations')
      .select('*')
      .eq('club_id', activeClub.id)
      .then(({ data }) => {
        locationsRef.current = (data ?? []) as ClubLocation[];
      });
  }, [activeClub]);

  // 위치 업데이트
  const updateLocation = useCallback(async (lat: number, lng: number) => {
    if (!member) return;

    const supabase = createClient();
    await supabase
      .from('members')
      .update({
        last_location_lat: lat,
        last_location_lng: lng,
      })
      .eq('id', member.id);
  }, [member]);

  // 근접성 체크
  const checkProximity = useCallback((lat: number, lng: number): boolean => {
    return locationsRef.current.some((loc) => {
      if (loc.lat === 0 && loc.lng === 0) return false;
      return distanceInMeters(lat, lng, loc.lat, loc.lng) <= PROXIMITY_RADIUS_M;
    });
  }, []);

  // 주기적 위치 체크
  useEffect(() => {
    if (!member || !activeClub) return;
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const isNearby = checkProximity(latitude, longitude);

        // 위치 업데이트 (서버에 저장)
        updateLocation(latitude, longitude);

        // 근처 도착/이탈 상태 변경 감지
        if (isNearby && !wasNearbyRef.current) {
          wasNearbyRef.current = true;
          // 온라인 상태로 변경
          const supabase = createClient();
          supabase
            .from('members')
            .update({ is_online: true })
            .eq('id', member.id)
            .then(() => {});
        } else if (!isNearby && wasNearbyRef.current) {
          wasNearbyRef.current = false;
        }
      },
      () => {
        // 위치 권한 거부 시 무시
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: CHECK_INTERVAL_MS,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [member, activeClub, checkProximity, updateLocation]);
}
