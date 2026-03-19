'use client';

import { useState } from 'react';
import { Map, MapMarker, CustomOverlayMap } from 'react-kakao-maps-sdk';
import useKakaoLoader from '@/lib/hooks/use-kakao-loader';
import type { Club } from '@/types';

interface ClubMapProps {
  readonly clubs: readonly Club[];
  readonly center: { lat: number; lng: number };
  readonly level?: number;
  readonly userLocation?: { lat: number; lng: number } | null;
  readonly onClubSelect?: (club: Club) => void;
  readonly className?: string;
}

export function ClubMap({
  clubs,
  center,
  level = 7,
  userLocation,
  onClubSelect,
  className = '',
}: ClubMapProps) {
  useKakaoLoader();
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

  const handleMarkerClick = (club: Club) => {
    setSelectedClubId(club.id === selectedClubId ? null : club.id);
    onClubSelect?.(club);
  };

  return (
    <Map
      center={center}
      style={{ width: '100%', height: '100%' }}
      level={level}
      className={className}
    >
      {/* 사용자 위치 마커 */}
      {userLocation && (
        <MapMarker
          position={userLocation}
          image={{
            src: 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png',
            size: { width: 24, height: 35 },
          }}
        />
      )}

      {/* 클럽 마커들 */}
      {clubs.map((club) => {
        const loc = club.locations?.[0];
        if (!loc || (loc.lat === 0 && loc.lng === 0)) return null;

        return (
          <MapMarker
            key={club.id}
            position={{ lat: loc.lat, lng: loc.lng }}
            onClick={() => handleMarkerClick(club)}
          />
        );
      })}

      {/* 선택된 클럽 오버레이 */}
      {clubs.map((club) => {
        if (club.id !== selectedClubId) return null;
        const loc = club.locations?.[0];
        if (!loc || (loc.lat === 0 && loc.lng === 0)) return null;

        return (
          <CustomOverlayMap
            key={`overlay-${club.id}`}
            position={{ lat: loc.lat, lng: loc.lng }}
            yAnchor={1.4}
          >
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 min-w-[180px]">
              <p className="font-bold text-sm">{club.name}</p>
              {club.description && (
                <p className="text-xs text-gray-500 mt-0.5">{club.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {loc.name}
                {club.member_count !== undefined && ` · ${club.member_count}명`}
              </p>
            </div>
          </CustomOverlayMap>
        );
      })}
    </Map>
  );
}
