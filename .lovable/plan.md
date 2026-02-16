
# Plan: Seed Database with 50 Mock Companies

## Verification Results
- **Google Sign-In**: Working -- redirects to Google OAuth page
- **Apple Sign-In**: Working -- redirects to Apple sign-in page

## Database Seeding

The `companies` table already exists with the correct schema. I will insert all 50 companies from `src/lib/mockData.ts` into the database using the database insert tool.

### Technical Details

**What will happen:**
- Use the database insert tool to run an `INSERT INTO public.companies` statement with all 50 mock companies
- Map fields from the mock data to database columns:
  - `name`, `sector`, `country` -> `name`, `sector`, `country`
  - `countryCode` -> `country_code`
  - `cashRunway` -> `cash_runway`
  - `insiderOwnership` -> `insider_ownership`
  - `scoutScore` -> `scout_score`
  - `nextCatalyst` -> `next_catalyst`
  - `catalystDate` -> `catalyst_date`
  - `institutionalFlow` -> `institutional_flow`
  - `marketCap` -> `market_cap`
  - `description` -> `description`
- The `id` column will use auto-generated UUIDs (not the mock string IDs)
- `created_at` and `updated_at` will default to `now()`

**No code changes needed** -- this is a data-only operation using the insert tool.

After seeding, the admin panel at `/admin` will display all 50 companies and the public dashboard can be connected to read from the database instead of mock data.
