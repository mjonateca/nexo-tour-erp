import Image from "next/image";
import Link from "next/link";
import { CalendarDays, CheckCircle2, MapPin, ShieldCheck, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/domain/submit-button";
import { createClient } from "@/lib/supabase/server";
import { submitAgencyBookingRequest } from "@/app/agencia/actions";

const input = "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-teal-500/20 focus:ring-4";
const label = "text-xs font-semibold text-slate-600";
const typeLabels: Record<string, string> = { ACTIVITY: "Excursión", TRANSFER: "Traslado", HOTEL: "Alojamiento" };
const unitLabels: Record<string, string> = { PER_PERSON: "por persona", PER_GROUP: "por grupo", PER_SERVICE: "por servicio", PER_NIGHT: "por noche" };

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ solicitud?: string; error?: string }>;
};

export default async function AgencyStorefrontPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { solicitud, error } = await searchParams;
  const supabase = await createClient();
  const { data: items, error: catalogueError } = await supabase
    .from("agency_storefront_items")
    .select("agency_slug,agency_name,agency_market,product_id,product_code,product_name,product_type,destination,sale_amount,currency,unit,valid_to")
    .eq("agency_slug", slug.toLowerCase())
    .order("product_name");

  if (catalogueError || !items?.length) notFound();
  const agency = items[0];
  const minDate = new Date().toISOString().slice(0, 10);

  return <main className="min-h-screen bg-[#f1f6f5] text-slate-900">
    <header className="bg-[#102d2d] text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-5">
        <div className="flex items-center gap-4"><Image src="https://tripspuntacana.com/wp-content/uploads/2025/04/TRIPS-LOGO-WHITE-e1744527416756.png" alt="TRIPS DMC" width={150} height={62} priority className="h-12 w-auto object-contain"/><div className="hidden border-l border-white/20 pl-4 sm:block"><p className="text-xs uppercase tracking-[.18em] text-teal-100">Portal de agencia</p><p className="font-semibold">{agency.agency_name}</p></div></div>
        <a href="#reservar" className="rounded-xl bg-[#eea63a] px-4 py-2.5 text-sm font-bold text-[#102d2d]">Reservar ahora</a>
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
        <div><p className="text-sm font-semibold uppercase tracking-[.2em] text-[#69d5c6]">Tarifas exclusivas · {agency.agency_market}</p><h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">Experiencias en el Caribe reservadas para tus clientes.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-slate-200">Consulta el catálogo negociado de {agency.agency_name}, selecciona fecha y pasajeros y envía la solicitud directamente al equipo operativo de TRIPS DMC.</p></div>
        <div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl border border-white/15 bg-white/5 p-4"><ShieldCheck className="text-[#69d5c6]"/><p className="mt-3 font-semibold">Precio de agencia</p><p className="mt-1 text-xs text-slate-300">Tarifa aplicada automáticamente</p></div><div className="rounded-xl border border-white/15 bg-white/5 p-4"><UsersRound className="text-[#69d5c6]"/><p className="mt-3 font-semibold">Gestión humana</p><p className="mt-1 text-xs text-slate-300">Confirmación por operaciones</p></div></div>
      </div>
    </header>

    <section className="mx-auto max-w-6xl px-5 py-10">
      {solicitud ? <div className="mb-8 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900"><CheckCircle2 className="mt-0.5 shrink-0"/><div><p className="font-semibold">Solicitud recibida correctamente</p><p className="mt-1 text-sm">Referencia <span className="font-mono font-bold">{solicitud}</span>. El equipo la verá en su cola y preparará la cotización.</p></div></div> : null}
      {error ? <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">No pudimos registrar la solicitud. Revisa los datos y la disponibilidad de la fecha e inténtalo nuevamente.</div> : null}
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-teal-700">Catálogo negociado</p><h2 className="mt-2 text-2xl font-semibold">Servicios disponibles para {agency.agency_name}</h2></div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{items.map((item) => <article key={`${item.product_id}-${item.valid_to}`} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-teal-700">{typeLabels[item.product_type] ?? item.product_type}</span><span className="font-mono text-xs text-slate-400">{item.product_code}</span></div><h3 className="mt-5 text-lg font-semibold">{item.product_name}</h3><p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500"><MapPin size={14}/>{item.destination}</p><div className="mt-6 border-t pt-4"><p className="text-2xl font-bold text-teal-800">{item.currency} {Number(item.sale_amount).toFixed(2)}</p><p className="text-xs text-slate-500">{unitLabels[item.unit] ?? item.unit} · tarifa de {agency.agency_name}</p></div></article>)}</div>

      <section id="reservar" className="mt-12 grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[.72fr_1.28fr]">
        <div className="bg-teal-800 p-7 text-white"><CalendarDays size={28} className="text-[#8de4d7]"/><h2 className="mt-5 text-2xl font-semibold">Solicitar reserva</h2><p className="mt-3 text-sm leading-6 text-teal-50">La solicitud conserva el precio de tu agencia y entra de inmediato en la cola operativa. Recibirás la cotización antes de confirmar definitivamente.</p><div className="mt-8 space-y-3 text-sm text-teal-50"><p>✓ Precio calculado automáticamente</p><p>✓ Referencia de seguimiento inmediata</p><p>✓ Validación final de disponibilidad</p></div></div>
        <form action={submitAgencyBookingRequest} className="grid gap-4 p-7 sm:grid-cols-2">
          <input type="hidden" name="agency_slug" value={slug.toLowerCase()}/><label className="hidden">Sitio web<input name="website" tabIndex={-1} autoComplete="off"/></label>
          <label className={`${label} sm:col-span-2`}>Servicio<select name="product_id" required className={input}><option value="">Selecciona un servicio</option>{items.map((item) => <option key={item.product_id} value={item.product_id}>{item.product_name} · {item.currency} {Number(item.sale_amount).toFixed(2)} {unitLabels[item.unit] ?? item.unit}</option>)}</select></label>
          <label className={label}>Fecha del servicio<input name="service_date" type="date" min={minDate} required className={input}/></label><label className={label}>Nombre del titular<input name="customer_name" required maxLength={120} className={input}/></label>
          <label className={label}>Adultos<input name="adults" type="number" min="1" max="50" defaultValue="2" required className={input}/></label><label className={label}>Niños<input name="children" type="number" min="0" max="50" defaultValue="0" required className={input}/></label>
          <label className={label}>Correo<input name="email" type="email" required maxLength={254} className={input}/></label><label className={label}>Teléfono / WhatsApp<input name="phone" maxLength={40} className={input}/></label>
          <label className={`${label} sm:col-span-2`}>Observaciones<textarea name="notes" maxLength={1000} rows={3} placeholder="Hotel, horario preferido, necesidades especiales…" className={input}/></label>
          <SubmitButton className="sm:col-span-2">Enviar solicitud de reserva</SubmitButton>
          <p className="text-xs text-slate-500 sm:col-span-2">Al enviar, solicitas disponibilidad; no se realiza ningún cobro automático.</p>
        </form>
      </section>
      <footer className="mt-8 flex flex-col gap-2 border-t pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><p>Operado por TRIPS DMC · Punta Cana, República Dominicana</p><Link href="https://tripspuntacana.com/" className="font-semibold text-teal-700">tripspuntacana.com</Link></footer>
    </section>
  </main>;
}

