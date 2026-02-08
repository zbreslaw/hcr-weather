# weather-site

A public Next.js weather dashboard with:
- Leaflet map (Esri World Imagery tiles)
- Wind + sun/moon overlay (suncalc)
- 24h charts (recharts)
- API routes: /api/latest and /api/range
- Data provider abstraction: Postgres, with mock option

## Run

1. Copy `.env.example` to `.env.local` and set station coords.
2. Install deps & run:

```bash
npm install
npm run dev
```

## Postgres schema

```sql
create table if not exists observations (
  time timestamptz primary key,
  tempf double precision,
  dewpointf double precision,
  humidity double precision,
  baromrelin double precision,
  windspeedmph double precision,
  windgustmph double precision,
  winddir double precision,
  dailyrainin double precision,
  solarradiation double precision,
  uv double precision
);

create index if not exists observations_time_desc on observations (time desc);

create table if not exists observations_5m (
  bucket timestamptz primary key,
  tempf_avg double precision, tempf_min double precision, tempf_max double precision,
  dewpointf_avg double precision, dewpointf_min double precision, dewpointf_max double precision,
  humidity_avg double precision, humidity_min double precision, humidity_max double precision,
  baromrelin_avg double precision, baromrelin_min double precision, baromrelin_max double precision,
  windspeedmph_avg double precision, windspeedmph_min double precision, windspeedmph_max double precision,
  windgustmph_max double precision,
  winddir_sin_avg double precision, winddir_cos_avg double precision,
  solarradiation_avg double precision, solarradiation_max double precision,
  uv_avg double precision, uv_max double precision,
  dailyrainin_max double precision
);

create table if not exists observations_15m (like observations_5m including all);
create table if not exists observations_1h (like observations_5m including all);
create table if not exists observations_1d (like observations_5m including all);
```
