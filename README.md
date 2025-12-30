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
```
