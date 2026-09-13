"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildBusinessSnapshot } from "@/lib/ask/snapshot";
import type { AskActionState } from "@/lib/ask/types";

export async function askPiccos(
  _prevState: AskActionState,
  formData: FormData,
): Promise<AskActionState> {
  const question = (formData.get("question") as string)?.trim();
  if (!question) {
    return { error: "Enter a question.", answer: null };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "Ask Piccos isn't configured yet — missing ANTHROPIC_API_KEY.", answer: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in.", answer: null };
  }

  const { data: membership } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!membership) {
    return { error: "No business found for your account.", answer: null };
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("name, timezone, currency")
    .eq("id", membership.business_id)
    .single();

  const timezone = business?.timezone ?? "Africa/Lagos";
  const currency = business?.currency ?? "NGN";

  // Built from the caller's own RLS-scoped client — a barber's snapshot
  // naturally only contains their own transactions, with zero special-
  // casing needed here for role.
  const snapshot = await buildBusinessSnapshot(supabase, membership.business_id, timezone, currency);

  const system = `You are Ask Piccos, a business assistant inside the Piccos barber shop management app. Answer the user's question using ONLY the JSON business data snapshot below — never invent numbers that aren't in it. All amounts are in ${currency}. If the data doesn't contain what's needed to answer, say so plainly instead of guessing. Be concise and specific, referencing actual figures from the snapshot.

Business: ${business?.name ?? "this business"}
The user's role is: ${membership.role}

Snapshot:
${JSON.stringify(snapshot)}`;

  try {
    const anthropic = new Anthropic();
    const message = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system,
      messages: [{ role: "user", content: question }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { error: "No answer was returned. Try asking again.", answer: null };
    }

    return { error: null, answer: textBlock.text };
  } catch (err) {
    const message =
      err instanceof Anthropic.APIError
        ? `Ask Piccos failed: ${err.message}`
        : "Something went wrong asking Piccos.";
    return { error: message, answer: null };
  }
}
