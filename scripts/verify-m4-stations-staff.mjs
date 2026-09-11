// One-off verification script for M4 (stations + staff).
//
// Proves against the live Supabase project that:
//   1. A secretary can create/manage staff but NOT stations (owner-only).
//   2. A secretary cannot delete staff (owner-only).
//   3. Cross-tenant reads/writes on stations and staff are rejected.
//   4. Staff no longer requires a linked profile_id (M4's schema change).
//
// Usage: node scripts/verify-m4-stations-staff.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

function loadEnvLocal() {
  const content = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

const env = loadEnvLocal();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const suffix = Date.now();
const credsOwner = { email: `piccos.m4.owner.${suffix}@example.com`, password: "TestPassword123!" };
const credsSecretary = { email: `piccos.m4.secretary.${suffix}@example.com`, password: "TestPassword123!" };
const credsOther = { email: `piccos.m4.other.${suffix}@example.com`, password: "TestPassword123!" };

let failures = 0;
function check(label, condition) {
  console.log(`  ${condition ? "✓" : "✗"} ${label}`);
  if (!condition) failures++;
}

async function newSignedInClient(creds) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await client.auth.signUp(creds);
  const { error, data } = await client.auth.signInWithPassword(creds);
  if (error) throw new Error(`signIn(${creds.email}) failed: ${error.message}`);
  return { client, userId: data.user.id };
}

async function main() {
  console.log("Setting up owner + business...");
  const owner = await newSignedInClient(credsOwner);
  const { data: business, error: createError } = await owner.client.rpc(
    "create_business_with_owner",
    { p_name: `M4 Test Shop ${suffix}` },
  );
  if (createError) throw new Error(createError.message);

  console.log("\nOwner creates a station...");
  const { data: station, error: stationError } = await owner.client
    .from("stations")
    .insert({ business_id: business.id, name: "Chair 1" })
    .select()
    .single();
  check("Owner can create a station", !stationError && station);

  console.log("Adding a secretary...");
  const secretary = await newSignedInClient(credsSecretary);
  await owner.client.from("business_members").insert({
    business_id: business.id,
    user_id: secretary.userId,
    role: "secretary",
    status: "active",
  });

  console.log("\nSecretary can read the station (read-only Shop view)...");
  const { data: secretaryReadStation } = await secretary.client
    .from("stations")
    .select("id, name")
    .eq("id", station.id)
    .maybeSingle();
  check("Secretary can see the station", secretaryReadStation?.id === station.id);

  console.log("Secretary attempts to create a station (should fail — owner only)...");
  const { error: secretaryStationError } = await secretary.client
    .from("stations")
    .insert({ business_id: business.id, name: "Secretary's rogue station" });
  check("Secretary CANNOT create a station", !!secretaryStationError);

  console.log("\nSecretary creates a staff member with no profile_id (M4 schema change)...");
  const { data: staff, error: staffError } = await secretary.client
    .from("staff")
    .insert({ business_id: business.id, display_name: "Jane Barber", station_id: station.id })
    .select()
    .single();
  check("Secretary can create staff without a profile_id", !staffError && staff && staff.profile_id === null);
  if (staffError) console.error("  ", staffError.message);

  console.log("Secretary updates the staff member's status...");
  const { error: staffUpdateError } = await secretary.client
    .from("staff")
    .update({ status: "inactive" })
    .eq("id", staff.id);
  check("Secretary can update staff", !staffUpdateError);

  console.log("Secretary attempts to delete the staff member (should fail — owner only)...");
  await secretary.client.from("staff").delete().eq("id", staff.id);
  const { data: stillThere } = await owner.client.from("staff").select("id").eq("id", staff.id).maybeSingle();
  check("Secretary's delete did NOT remove staff (RLS blocked it)", stillThere?.id === staff.id);

  console.log("\nOwner deletes the staff member (should succeed)...");
  const { error: ownerDeleteError } = await owner.client.from("staff").delete().eq("id", staff.id);
  check("Owner CAN delete staff", !ownerDeleteError);

  console.log("\nSetting up an unrelated business for cross-tenant checks...");
  const other = await newSignedInClient(credsOther);
  await other.client.rpc("create_business_with_owner", { p_name: `M4 Other Shop ${suffix}` });

  console.log("Unrelated owner cannot see the first business's stations...");
  const { data: crossStations } = await other.client
    .from("stations")
    .select("id")
    .eq("business_id", business.id);
  check("Cross-tenant station read returns 0 rows", (crossStations ?? []).length === 0);

  console.log("Unrelated owner cannot insert a staff row into the first business...");
  const { error: crossStaffError } = await other.client
    .from("staff")
    .insert({ business_id: business.id, display_name: "Intruder" });
  check("Cross-tenant staff insert is rejected", !!crossStaffError);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nScript error:", err.message);
  process.exit(1);
});
