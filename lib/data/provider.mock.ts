import type { WeatherObs } from "./types";
import type { WeatherProvider } from "./provider";

export class MockProvider implements WeatherProvider {
  async latest(): Promise<WeatherObs> {
    const now = new Date();
    return {
      time: now.toISOString(),
      tempf: 41 + Math.random() * 2,
      dewpointf: 38 + Math.random() * 2,
      baromrelin: 29.8 + Math.random() * 0.1,
      windspeedmph: 2 + Math.random() * 6,
      windgustmph: 5 + Math.random() * 10,
      winddir: Math.floor(Math.random() * 360),
      humidity: 70 + Math.random() * 20,
      dailyrainin: Math.random() * 0.1,
      solarradiation: Math.random() * 300,
      uv: Math.random() * 2
    };
  }

  async range(from: Date, to: Date): Promise<WeatherObs[]> {
    const points: WeatherObs[] = [];
    const stepMs = 5 * 60 * 1000; // 5 min
    for (let t = from.getTime(); t <= to.getTime(); t += stepMs) {
      points.push({
        time: new Date(t).toISOString(),
        tempf: 40 + Math.sin(t / 3.6e6) * 4 + Math.random(),
        dewpointf: 37 + Math.sin(t / 3.6e6) * 2 + Math.random(),
        baromrelin: 29.9 + Math.sin(t / 7.2e6) * 0.07 + Math.random() * 0.01,
        windspeedmph: 2 + Math.random() * 6,
        windgustmph: 5 + Math.random() * 10,
        winddir: Math.floor((t / 60000) % 360)
      });
    }
    return points;
  }
}
