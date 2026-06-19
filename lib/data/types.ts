export type WeatherObs = {
  time: string; // ISO timestamp
  tempf?: number | null;
  tempfMin?: number | null;
  tempfMax?: number | null;
  dewpointf?: number | null;
  dewpointfMin?: number | null;
  dewpointfMax?: number | null;
  humidity?: number | null;
  humidityMin?: number | null;
  humidityMax?: number | null;
  baromrelin?: number | null;
  baromrelinMin?: number | null;
  baromrelinMax?: number | null;
  windspeedmph?: number | null;
  windspeedmphMin?: number | null;
  windspeedmphMax?: number | null;
  windgustmph?: number | null;
  winddir?: number | null;
  dailyrainin?: number | null;
  solarradiation?: number | null;
  solarradiationMax?: number | null;
  uv?: number | null;
  uvMax?: number | null;

  raw?: Record<string, any>;
};
