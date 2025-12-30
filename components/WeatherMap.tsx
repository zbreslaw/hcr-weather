"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type ReactNode } from "react";
import { useMapEvents } from "react-leaflet";
import type { WeatherObs } from "@/lib/data/types";
import Overlays from "./Overlays";

import { divIcon, type LatLngExpression } from "leaflet";

import type { MapContainerProps } from "react-leaflet";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false }) as React.FC<MapContainerProps>;
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Polyline = dynamic(() => import("react-leaflet").then((m) => m.Polyline), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), { ssr: false });

type Props = { latest: WeatherObs | null; alerts?: ReactNode };

type ArrowShape = {
  line: [number, number][];
  head: [number, number][];
  mid: [number, number];
};

const hiddenMarkerIcon = divIcon({
  className: "hiddenMarkerIcon",
  html: "",
  iconSize: [0, 0],
  iconAnchor: [0, 0],
  tooltipAnchor: [0, 0]
});

function buildPixelArrow(
  map: any,
  stationLat: number,
  stationLon: number,
  windDirDegFrom: number,
  lengthPx: number,
  headPx: number,
  headAngleDeg = 25
): ArrowShape {
  const startPoint = map.latLngToContainerPoint([stationLat, stationLon]);
  const arrowDirTo = (windDirDegFrom + 180) % 360;
  const theta = (arrowDirTo * Math.PI) / 180;
  const dx = Math.sin(theta) * lengthPx;
  const dy = -Math.cos(theta) * lengthPx;

  const endPoint: [number, number] = [startPoint.x + dx, startPoint.y + dy];
  const endLatLng = map.containerPointToLatLng(endPoint);
  const line: [number, number][] = [
    [stationLat, stationLon],
    [endLatLng.lat, endLatLng.lng]
  ];

  const angle = Math.atan2(dy, dx);
  const a = (headAngleDeg * Math.PI) / 180;
  const leftPoint: [number, number] = [
    endPoint[0] - headPx * Math.cos(angle - a),
    endPoint[1] - headPx * Math.sin(angle - a)
  ];
  const rightPoint: [number, number] = [
    endPoint[0] - headPx * Math.cos(angle + a),
    endPoint[1] - headPx * Math.sin(angle + a)
  ];
  const leftLatLng = map.containerPointToLatLng(leftPoint);
  const rightLatLng = map.containerPointToLatLng(rightPoint);
  const head: [number, number][] = [
    [leftLatLng.lat, leftLatLng.lng],
    [endLatLng.lat, endLatLng.lng],
    [rightLatLng.lat, rightLatLng.lng]
  ];
  const midPoint = map.containerPointToLatLng([startPoint.x + dx / 2, startPoint.y + dy / 2]);

  return {
    line,
    head,
    mid: [midPoint.lat, midPoint.lng]
  };
}

type WindArrowsProps = {
  stationLat: number;
  stationLon: number;
  windDir: number | null;
  windMph: number | null;
  gustMph: number | null;
};

function WindArrows({ stationLat, stationLon, windDir, windMph, gustMph }: WindArrowsProps) {
  const [, setRev] = useState(0);
  const map = useMapEvents({
    zoomend: () => setRev((v: number) => v + 1),
    moveend: () => setRev((v: number) => v + 1),
    resize: () => setRev((v: number) => v + 1)
  });

  const arrowStrokeWeight = 4;
  const showGust = gustMph != null && windMph != null && Math.abs(gustMph - windMph) > 2;

  const windArrow = useMemo(() => {
    if (windDir == null || windMph == null) return null;
    const headPx = Math.max(6, Math.round(25 * 0.35));
    return buildPixelArrow(map, stationLat, stationLon, windDir, 25, headPx);
  }, [map, stationLat, stationLon, windDir, windMph]);

  const gustArrow = useMemo(() => {
    if (windDir == null || gustMph == null || !showGust) return null;
    const headPx = Math.max(7, Math.round(35 * 0.35));
    return buildPixelArrow(map, stationLat, stationLon, windDir, 35, headPx);
  }, [map, stationLat, stationLon, windDir, gustMph, showGust]);

  return (
    <>
      {windArrow && (
        <>
          <Polyline positions={windArrow.line} pathOptions={{ weight: arrowStrokeWeight, opacity: 0.9 }} />
          <Polyline positions={windArrow.head} pathOptions={{ weight: arrowStrokeWeight, opacity: 0.9 }} />
          {windMph != null && (
            <Marker position={windArrow.mid} icon={hiddenMarkerIcon}>
              <Tooltip>
                <span style={{ opacity: 0.95 }}>{`${windMph.toFixed(1)} mph`}</span>
              </Tooltip>
            </Marker>
          )}
        </>
      )}

      {gustArrow && (
        <>
          <Polyline positions={gustArrow.line} pathOptions={{ weight: arrowStrokeWeight, opacity: 0.8, dashArray: "6,8" }} />
          <Polyline positions={gustArrow.head} pathOptions={{ weight: arrowStrokeWeight, opacity: 0.8, dashArray: "6,8" }} />
          {gustMph != null && (
            <Marker position={gustArrow.mid} icon={hiddenMarkerIcon}>
              <Tooltip>
                <span style={{ opacity: 0.95 }}>{`Gust ${gustMph.toFixed(1)} mph`}</span>
              </Tooltip>
            </Marker>
          )}
        </>
      )}
    </>
  );
}

export default function WeatherMap({ latest, alerts }: Props) {
  // Set these in .env.local (NEXT_PUBLIC_*)
  const stationLat = Number(process.env.NEXT_PUBLIC_STATION_LAT ?? "44.05");
  const stationLon = Number(process.env.NEXT_PUBLIC_STATION_LON ?? "-123.09");

  // Wind data
  const windDir = latest?.winddir ?? null; // degrees FROM
  const windMph = latest?.windspeedmph ?? null;
  const gustMph = latest?.windgustmph ?? null;

  return (
    <div className="mapBlock">
      <div className="mapWrap">
        <MapContainer
          className="map"
          center={[stationLat, stationLon] as LatLngExpression}
          zoom={17}
          minZoom={3}
          maxZoom={19}
          scrollWheelZoom={false}
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
          />

        {/* Station dot (solid black) */}
        <CircleMarker
          center={[stationLat, stationLon] as LatLngExpression}
          radius={7}
          pathOptions={{
            color: "#000000",
            fillColor: "#000000",
            fillOpacity: 1
          }}
        >
          <Popup>
            <div style={{ fontWeight: 650 }}>Weather Station</div>
            {latest ? (
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                Updated: {new Date(latest.time).toLocaleString()}
                <br />
                Temp: {latest.tempf ?? "—"}°F
              </div>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.85 }}>Loading…</div>
            )}
          </Popup>
        </CircleMarker>

        <WindArrows stationLat={stationLat} stationLon={stationLon} windDir={windDir} windMph={windMph} gustMph={gustMph} />
        </MapContainer>

        <div className="northMarker" aria-label="North">
          N
        </div>
      </div>

      <div className="underMapOverlays">
        <Overlays latest={latest} stationLat={stationLat} stationLon={stationLon} />
        {alerts}
      </div>
    </div>
  );
}
