import type { WeatherObs } from "./types";
import { MockProvider } from "./provider.mock";
import { PostgresProvider } from "./provider.postgres";

export interface WeatherProvider {
  latest(): Promise<WeatherObs>;
  range(from: Date, to: Date): Promise<WeatherObs[]>;
}

export function getProvider(): WeatherProvider {
  const src = process.env.WEATHER_DATA_SOURCE ?? "mock"; // "mock" | "postgres"
  if (src === "postgres") return new PostgresProvider();
  return new MockProvider();
}
