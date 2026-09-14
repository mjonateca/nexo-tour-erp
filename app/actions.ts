"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const number = (form: FormData, key: string) => Number(form.get(key) ?? 0);
const reference = (prefix: string) => `${prefix}-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${Date.now().toString().slice(-5)}`;
const fail = (message: string): never => { throw new Error(message); };

export async function createCustomer(form: FormData) {
  const { supabase, tenantId } = await getTenantContext();
  const payload = { tenant_id: tenantId, first_name: text(form, "first_name"), last_name: text(form, "last_name"), email: text(form, "email") || null, phone: text(form, "phone") || null, nationality: text(form, "nationality") || null, language: text(form, "language") || "es" };
  if (!payload.first_name || !payload.last_name) fail("Nombre y apellido son obligatorios");
  const { error } = await supabase.from("customers").insert(payload);
  if (error) fail(`No se pudo crear el cliente: ${error.message}`);
  revalidatePath("/crm");
}

export async function createAgency(form: FormData) {
  const { supabase, tenantId } = await getTenantContext();
  const code = text(form, "code").toUpperCase();
  const payload = { tenant_id: tenantId, code, portal_slug: code.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), name: text(form, "name"), market: text(form, "market"), country: text(form, "country"), currency: text(form, "currency").toUpperCase() || "USD", email: text(form, "email") || null, phone: text(form, "phone") || null, credit_limit: number(form, "credit_limit"), commission_pct: number(form, "commission_pct"), payment_terms_days: number(form, "payment_terms_days") || 15, status: "ACTIVE" };
  if (!payload.code || !payload.name || !payload.market || !payload.country) fail("Código, nombre, mercado y país son obligatorios");
  const { error } = await supabase.from("agencies").insert(payload);
  if (error) fail(`No se pudo crear la agencia: ${error.message}`);
  revalidatePath("/crm");
  revalidatePath("/products");
}

export async function createAgencyRate(form: FormData) {
  const { supabase, tenantId } = await getTenantContext();
  const payload = { tenant_id: tenantId, agency_id: text(form, "agency_id"), product_id: text(form, "product_id"), valid_from: text(form, "valid_from"), valid_to: text(form, "valid_to"), sale_amount: number(form, "sale_amount"), currency: text(form, "currency").toUpperCase() || "USD", unit: text(form, "unit") || "PER_PERSON" };
  const { error } = await supabase.from("agency_product_rates").upsert(payload, { onConflict: "agency_id,product_id,valid_from" });
  if (error) fail(`No se pudo guardar la tarifa: ${error.message}`);
  revalidatePath("/products");
}

export async function createSupplier(form: FormData) {
  const { supabase, tenantId } = await getTenantContext();
  const payload = {
    tenant_id: tenantId,
    code: text(form, "code").toUpperCase(),
    legal_name: text(form, "legal_name"),
    supplier_type: text(form, "supplier_type") || "ACTIVITY",
    status: "ACTIVE",
    default_currency: text(form, "currency").toUpperCase() || "USD",
    country: text(form, "country"),
    city: text(form, "city"),
  };
  if (!payload.code || !payload.legal_name || !payload.country || !payload.city) fail("Código, nombre, país y ciudad son obligatorios");
  const { error } = await supabase.from("suppliers").insert(payload);
  if (error) fail(`No se pudo crear el proveedor: ${error.message}`);
  revalidatePath("/products");
}

export async function createCatalogProduct(form: FormData) {
  const { supabase, tenantId } = await getTenantContext();
  const supplierId = text(form, "supplier_id");
  const code = text(form, "code").toUpperCase();
  const name = text(form, "name");
  const currency = text(form, "currency").toUpperCase() || "USD";
  const validFrom = text(form, "valid_from");
  const validTo = text(form, "valid_to");
  const costAmount = number(form, "cost_amount");
  if (!supplierId || !code || !name || !validFrom || !validTo || costAmount < 0) fail("Completa los datos del producto y su coste base");

  const { data: product, error: productError } = await supabase.from("products").insert({
    tenant_id: tenantId,
    supplier_id: supplierId,
    code,
    type: text(form, "type") || "ACTIVITY",
    name,
    destination: text(form, "destination"),
    status: "ACTIVE",
    default_currency: currency,
  }).select("id").single();
  if (productError || !product) throw new Error(`No se pudo crear el producto: ${productError?.message ?? "error desconocido"}`);
  const productId = product.id;

  const contractCode = `${code}-${validFrom.slice(0, 4)}`;
  const { data: contract, error: contractError } = await supabase.from("contracts").insert({
    tenant_id: tenantId,
    supplier_id: supplierId,
    code: contractCode,
    name: `Contrato base · ${name}`,
    valid_from: validFrom,
    valid_to: validTo,
    currency,
    status: "ACTIVE",
  }).select("id").single();
  if (contractError || !contract) {
    await supabase.from("products").delete().eq("id", productId);
    throw new Error(`No se pudo crear el contrato base: ${contractError?.message ?? "error desconocido"}`);
  }

  const { error: rateError } = await supabase.from("contract_rates").insert({
    tenant_id: tenantId,
    contract_id: contract.id,
    product_id: productId,
    valid_from: validFrom,
    valid_to: validTo,
    cost_amount: costAmount,
    currency,
    unit: text(form, "unit") || "PER_PERSON",
  });
  if (rateError) {
    await supabase.from("contracts").delete().eq("id", contract.id);
    await supabase.from("products").delete().eq("id", productId);
    fail(`No se pudo guardar el coste base: ${rateError.message}`);
  }
  revalidatePath("/products");
}

export async function createQuote(form: FormData) {
  const { supabase, tenantId } = await getTenantContext();
  const agencyId = text(form, "agency_id") || null;
  const customerId = text(form, "customer_id") || null;
  const productId = text(form, "product_id");
  const serviceDate = text(form, "service_date");
  const quantity = Math.max(1, number(form, "quantity"));
  if (!agencyId && !customerId) fail("Selecciona una agencia o un cliente");
  const [{ data: product, error: productError }, { data: contractRate }] = await Promise.all([
    supabase.from("products").select("id,name,default_currency").eq("id", productId).single(),
    supabase.from("contract_rates").select("cost_amount,currency,unit").eq("product_id", productId).lte("valid_from", serviceDate).gte("valid_to", serviceDate).order("cost_amount").limit(1).maybeSingle()
  ]);
  if (productError || !product) throw new Error("Producto no encontrado");
  const { data: agencyRate } = agencyId ? await supabase.from("agency_product_rates").select("sale_amount,currency,unit").eq("agency_id", agencyId).eq("product_id", productId).lte("valid_from", serviceDate).gte("valid_to", serviceDate).order("valid_from", { ascending: false }).limit(1).maybeSingle() : { data: null };
  const unitCost = Number(contractRate?.cost_amount ?? 0);
  const unitSale = Number(agencyRate?.sale_amount ?? Math.round(unitCost * 1.25 * 100) / 100);
  const quoteRef = reference("COT");
  const quotePayload = { tenant_id: tenantId, reference: quoteRef, agency_id: agencyId, customer_id: customerId, status: "DRAFT", travel_start: serviceDate, travel_end: serviceDate, currency: agencyRate?.currency ?? contractRate?.currency ?? product.default_currency, total_cost: unitCost * quantity, total_sale: unitSale * quantity, notes: text(form, "notes") || null, pricing_snapshot: { source: agencyRate ? "AGENCY_RATE" : "DEFAULT_MARKUP", product_name: product.name, unit_cost: unitCost, unit_sale: unitSale, quantity, generated_at: new Date().toISOString() } };
  const { data: quote, error: quoteError } = await supabase.from("quotes").insert(quotePayload).select("id").single();
  if (quoteError || !quote) throw new Error(`No se pudo crear la cotización: ${quoteError?.message ?? "error desconocido"}`);
  const { error: serviceError } = await supabase.from("quote_services").insert({ tenant_id: tenantId, quote_id: quote.id, product_id: productId, service_date: serviceDate, quantity, cost_amount: unitCost * quantity, sale_amount: unitSale * quantity, status: "OPTION" });
  if (serviceError) fail(`Cotización creada sin servicio: ${serviceError.message}`);
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  redirect(`/sales?created=${quoteRef}`);
}

export async function convertQuoteToBooking(form: FormData) {
  const { supabase, tenantId } = await getTenantContext();
  const quoteId = text(form, "quote_id");
  const { data: quote, error } = await supabase.from("quotes").select("*,quote_services(*)").eq("id", quoteId).single();
  if (error || !quote) throw new Error("Cotización no encontrada");
  const bookingRef = reference("RES");
  const { data: booking, error: bookingError } = await supabase.from("bookings").insert({ tenant_id: tenantId, reference: bookingRef, quote_id: quote.id, agency_id: quote.agency_id, customer_id: quote.customer_id, status: "REQUESTED", travel_start: quote.travel_start, travel_end: quote.travel_end, currency: quote.currency, total_cost: quote.total_cost, total_sale: quote.total_sale, pricing_snapshot: quote.pricing_snapshot }).select("id").single();
  if (bookingError || !booking) throw new Error(`No se pudo convertir: ${bookingError?.message ?? "error desconocido"}`);
  const services = (quote.quote_services ?? []).map((service: Record<string, unknown>) => ({ tenant_id: tenantId, booking_id: booking.id, product_id: service.product_id, service_date: service.service_date, status: "REQUESTED", cost_amount: service.cost_amount, sale_amount: service.sale_amount }));
  if (services.length) await supabase.from("booking_services").insert(services);
  await Promise.all([
    supabase.from("quotes").update({ status: "CONVERTED" }).eq("id", quote.id),
    supabase.from("operations_tasks").insert({ tenant_id: tenantId, booking_id: booking.id, title: `Confirmar servicios ${bookingRef}`, due_at: new Date(`${quote.travel_start}T15:00:00Z`).toISOString(), status: "OPEN", priority: "HIGH" }),
    supabase.from("activities").insert({ tenant_id: tenantId, booking_id: booking.id, title: `Inicio de servicios ${bookingRef}`, activity_type: "SERVICE", starts_at: new Date(`${quote.travel_start}T09:00:00Z`).toISOString(), status: "PLANNED" })
  ]);
  revalidatePath("/sales"); revalidatePath("/operations"); revalidatePath("/dashboard");
  redirect(`/operations?booking=${bookingRef}`);
}

export async function updateTask(form: FormData) {
  const { supabase, user } = await getTenantContext();
  const taskId = text(form, "task_id");
  const status = text(form, "status");
  const assignedTo = text(form, "assigned_to") || null;
  const resolutionNotes = text(form, "resolution_notes") || null;
  if (status === "DONE" && !resolutionNotes) fail("Describe brevemente cómo se resolvió la tarea antes de completarla");
  const { error } = await supabase.from("operations_tasks").update({
    status,
    assigned_to: assignedTo,
    resolution_notes: resolutionNotes,
    completed_at: status === "DONE" ? new Date().toISOString() : null,
    completed_by: status === "DONE" ? user.id : null,
  }).eq("id", taskId);
  if (error) fail(`No se pudo actualizar la tarea: ${error.message}`);
  revalidatePath("/operations"); revalidatePath("/dashboard");
}

export async function createInvoice(form: FormData) {
  const { supabase, tenantId } = await getTenantContext();
  const bookingId = text(form, "booking_id");
  const { data: booking, error } = await supabase.from("bookings").select("id,total_sale,currency").eq("id", bookingId).single();
  if (error || !booking) throw new Error("Reserva no encontrada");
  const invoiceRef = reference("FAC");
  const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + Math.max(0, number(form, "terms") || 15));
  const { data: invoice, error: invoiceError } = await supabase.from("invoices").insert({ tenant_id: tenantId, booking_id: booking.id, reference: invoiceRef, status: "ISSUED", currency: booking.currency, total_amount: booking.total_sale, due_date: dueDate.toISOString().slice(0, 10), issued_at: new Date().toISOString() }).select("id").single();
  if (invoiceError || !invoice) throw new Error(`No se pudo emitir la factura: ${invoiceError?.message ?? "error desconocido"}`);
  revalidatePath("/finance");
  redirect(`/documents/invoice/${invoice.id}`);
}

export async function convertPublicRequestToQuote(form: FormData) {
  const { supabase, tenantId } = await getTenantContext();
  const requestId = text(form, "request_id");
  const { data: request, error: requestError } = await supabase.from("public_booking_requests").select("*").eq("id", requestId).eq("status", "NEW").single();
  if (requestError || !request) fail("La solicitud ya fue gestionada o no existe");

  const [{ data: product, error: productError }, { data: contractRate }] = await Promise.all([
    supabase.from("products").select("id,name").eq("id", request.product_id).single(),
    supabase.from("contract_rates").select("cost_amount").eq("product_id", request.product_id).lte("valid_from", request.service_date).gte("valid_to", request.service_date).order("cost_amount").limit(1).maybeSingle(),
  ]);
  if (productError || !product) fail("El servicio solicitado ya no existe");
  const productName = product?.name;
  if (!productName) fail("El servicio solicitado no tiene nombre comercial");

  let { data: customer } = await supabase.from("customers").select("id").ilike("email", request.email).limit(1).maybeSingle();
  if (!customer) {
    const parts = String(request.customer_name).trim().split(/\s+/);
    const firstName = parts.shift() ?? request.customer_name;
    const lastName = parts.join(" ") || "—";
    const created = await supabase.from("customers").insert({ tenant_id: tenantId, first_name: firstName, last_name: lastName, email: request.email, phone: request.phone, language: "es" }).select("id").single();
    if (created.error || !created.data) fail(`No se pudo crear el cliente: ${created.error?.message ?? "error desconocido"}`);
    customer = created.data;
  }
  const customerId = customer?.id;
  if (!customerId) fail("No se pudo identificar al cliente de la solicitud");

  const quantity = request.unit === "PER_PERSON" ? request.adults + request.children : 1;
  const unitCost = Number(contractRate?.cost_amount ?? 0);
  const quoteRef = reference("COT");
  const { data: quote, error: quoteError } = await supabase.from("quotes").insert({
    tenant_id: tenantId,
    reference: quoteRef,
    agency_id: request.agency_id,
    customer_id: customerId,
    status: "DRAFT",
    travel_start: request.service_date,
    travel_end: request.service_date,
    currency: request.currency,
    total_cost: unitCost * quantity,
    total_sale: request.total_amount,
    notes: [request.notes, `Solicitud web ${request.reference} · ${request.adults} adultos · ${request.children} niños`].filter(Boolean).join("\n"),
    pricing_snapshot: { source: "AGENCY_STOREFRONT", request_reference: request.reference, product_name: productName, unit_cost: unitCost, unit_sale: request.unit_price, quantity, generated_at: new Date().toISOString() },
  }).select("id").single();
  if (quoteError || !quote) fail(`No se pudo crear la cotización: ${quoteError?.message ?? "error desconocido"}`);
  const quoteId = quote?.id;
  if (!quoteId) fail("No se pudo identificar la cotización creada");

  const { error: serviceError } = await supabase.from("quote_services").insert({ tenant_id: tenantId, quote_id: quoteId, product_id: request.product_id, service_date: request.service_date, quantity, cost_amount: unitCost * quantity, sale_amount: request.total_amount, status: "OPTION" });
  if (serviceError) fail(`La cotización se creó sin servicio: ${serviceError.message}`);
  await supabase.from("public_booking_requests").update({ status: "QUOTED", quote_id: quoteId, updated_at: new Date().toISOString() }).eq("id", request.id);
  revalidatePath("/operations");
  revalidatePath("/dashboard");
  revalidatePath("/sales");
  redirect(`/documents/quote/${quoteId}`);
}
