export type WeatherObs = {
  time: string; // ISO timestamp
  tempf?: number | null;
  dewpointf?: number | null;
  humidity?: number | null;
  baromrelin?: number | null;
  windspeedmph?: number | null;
  windgustmph?: number | null;
  winddir?: number | null;
  dailyrainin?: number | null;
  solarradiation?: number | null;
  uv?: number | null;

  raw?: Record<string, any>;
};
