// One-off verification script for M3 (business setup).
//
// Proves against the live Supabase project that:
//   1. The owner can update their business (via the RLS-scoped UPDATE
//      the Shop page's "Save changes" button actually uses).
//   2. A secretary — added directly via business_members, since there's
//      no invite UI yet — can SEE the business but CANNOT update it.
// This exercises the same "owner-only edit" rule the Shop page's
// readOnly prop encodes in the UI, but confirms it's enforced by RLS,
// not just hidden client-side.
//
// Usage: node scripts/verify-m3-business-setup.mjs

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
const credsOwner = { email: `piccos.m3.owner.${suffix}@example.com`, password: "TestPassword123!" };
const credsSecretary = { email: `piccos.m3.secretary.${suffix}@example.com`, password: "TestPassword123!" };

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
    { p_name: `M3 Test Shop ${suffix}` },
  );
  if (createError) throw new Error(createError.message);

  console.log("\nOwner updates the business (same call the Shop page makes)...");
  const { error: ownerUpdateError } = await owner.client
    .from("businesses")
    .update({ name: `M3 Test Shop ${suffix} (edited)` })
    .eq("id", business.id);
  check("Owner update succeeds", !ownerUpdateError);

  console.log("\nAdding a secretary (simulating a future invite flow)...");
  const secretary = await newSignedInClient(credsSecretary);
  const { error: addMemberError } = await owner.client.from("business_members").insert({
    business_id: business.id,
    user_id: secretary.userId,
    role: "secretary",
    status: "active",
  });
  check("Owner can add a secretary member", !addMemberError);
  if (addMemberError) console.error("  ", addMemberError.message);

  console.log("\nSecretary reads the business (Shop page's read-only view)...");
  const { data: secretaryRead } = await secretary.client
    .from("businesses")
    .select("id, name")
    .eq("id", business.id)
    .maybeSingle();
  check("Secretary can see the business", secretaryRead?.id === business.id);

  console.log("Secretary attempts to update the business...");
  await secretary.client.from("businesses").update({ name: "Hacked by secretary" }).eq("id", business.id);
  const { data: afterSecretaryAttempt } = await owner.client
    .from("businesses")
    .select("name")
    .eq("id", business.id)
    .single();
  check(
    "Secretary's update did NOT change the name (RLS blocked it)",
    afterSecretaryAttempt?.name === `M3 Test Shop ${suffix} (edited)`,
  );

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\nScript error:", err.message);
  process.exit(1);
});
