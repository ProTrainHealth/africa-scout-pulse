

# Route "Get Access" Button to Sign Up

## Change
Update the "Get Access" button in `src/components/Navbar.tsx` to navigate to `/auth` instead of `/dashboard`, so users are directed to the sign-up/login page.

## Technical Detail
- **File:** `src/components/Navbar.tsx` (line 40)
- Change the `Link` `to` prop from `"/dashboard"` to `"/auth"`

Single one-line change, no other files affected.

