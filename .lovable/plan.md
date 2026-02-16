

# Connect Public Dashboard to Live Database

## Verification: Admin Panel
- The database contains all **50 companies** (confirmed via query).
- The admin panel at `/admin` requires authentication to view companies, which is working correctly. When logged in as an admin, all 50 companies will display.

## Plan: Connect Dashboard to Database

The public dashboard (`/dashboard`) currently imports static data from `mockData.ts`. We need to replace this with a live database query.

### Changes to `src/pages/Dashboard.tsx`

1. **Remove** the `mockCompanies` import
2. **Add** a `useEffect` + `useState` to fetch companies from the `companies` table via the database client
3. **Map** the database column names (snake_case) to the component's expected format (camelCase):
   - `cash_runway` -> `cashRunway`
   - `country_code` -> `countryCode`
   - `insider_ownership` -> `insiderOwnership`
   - `scout_score` -> `scoutScore`
   - `next_catalyst` -> `nextCatalyst`
   - `catalyst_date` -> `catalystDate`
   - `institutional_flow` -> `institutionalFlow`
   - `market_cap` -> `marketCap`
4. **Add** a loading state while data is being fetched
5. The existing filter/sort logic will continue to work since the data shape remains the same `Company` type

### Why This Works Without Auth
The `companies` table has an RLS policy "Anyone can view companies" with `USING (true)` for SELECT, so the public dashboard can read all companies without authentication.

### No Other Files Need Changes
- `mockData.ts` can remain for reference but will no longer be used by the dashboard
- All child components (`SectorBadge`, `ScoutScoreBar`, `FlowIndicator`) remain unchanged

