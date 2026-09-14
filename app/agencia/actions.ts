"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const bookingRequestSchema = z.object({
  agency_slug: z.string().regex(/^[a-z0-9-]{2,80}$/),
  product_id: z.string().uuid(),
  service_date: z.string().date(),
  adults: z.coerce.number().int().min(1).max(50),
  children: z.coerce.number().int().min(0).max(50),
  customer_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1000).optional(),
  website: z.string().max(0).optional(),
});

export async function submitAgencyBookingRequest(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const fallbackSlug = String(raw.agency_slug ?? "").toLowerCase();
  const parsed = bookingRequestSchema.safeParse(raw);
  if (!parsed.success || parsed.data.website) {
    redirect(`/agencia/${encodeURIComponent(fallbackSlug)}?error=datos`);
  }
  if (parsed.data.service_date < new Date().toISOString().slice(0, 10)) {
    redirect(`/agencia/${parsed.data.agency_slug}?error=fecha`);
  }

  const id = randomUUID();
  const reference = `WEB-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${id.replaceAll("-", "").slice(0, 6).toUpperCase()}`;
  const supabase = await createClient();
  const { error } = await supabase.from("public_booking_requests").insert({
    id,
    agency_slug: parsed.data.agency_slug,
    product_id: parsed.data.product_id,
    service_date: parsed.data.service_date,
    adults: parsed.data.adults,
    children: parsed.data.children,
    customer_name: parsed.data.customer_name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    notes: parsed.data.notes || null,
  });

  if (error) {
    console.error(JSON.stringify({ level: "error", message: "public_booking_request_failed", code: error.code }));
    redirect(`/agencia/${parsed.data.agency_slug}?error=disponibilidad`);
  }
  console.log(JSON.stringify({ level: "info", message: "public_booking_request_created", reference, agency: parsed.data.agency_slug }));
  redirect(`/agencia/${parsed.data.agency_slug}?solicitud=${encodeURIComponent(reference)}`);
}

