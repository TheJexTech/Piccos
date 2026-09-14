// Sticky "last staff selected" default for Quick Record, so the same
// barber logging several sales in a row doesn't have to re-pick themselves
// every time. Written client-side (non-httpOnly — it's just a UX default,
// not sensitive) and read server-side in activity/page.tsx.
export const LAST_STAFF_COOKIE = "last_staff_id";
