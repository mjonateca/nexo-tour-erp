import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { GlassPanel, PageHeader } from "@/components/domain/ui";
import { SubmitButton } from "@/components/domain/submit-button";
import { createAgency, createCustomer } from "@/app/actions";
import { getTenantContext } from "@/lib/tenant";

const input = "mt-1.5 w-full rounded-lg border bg-surface/70 px-3 py-2 text-sm outline-none ring-accent/30 focus:ring-2";
const label = "text-xs font-medium text-muted";

export default async function CrmPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view = "customers" } = await searchParams;
  const { supabase } = await getTenantContext();
  const [{ data: customers }, { data: agencies }] = await Promise.all([
    supabase.from("customers").select("*").order("created_at", { ascending: false }),
    supabase.from("agencies").select("*").order("name")
  ]);
  const tab = (key: string, title: string, count: number) => <Link href={`/crm?view=${key}`} className={`rounded-lg px-4 py-2 text-sm font-medium ${view === key ? "bg-accent text-white" : "text-muted hover:bg-ink/5"}`}>{title} <span className="ml-1 opacity-70">{count}</span></Link>;
  return <AppShell>
    <PageHeader eyebrow="CRM" title="Clientes y agencias" description="Dos maestros separados: viajeros directos y cuentas comerciales B2B."/>
    <div className="mt-5 flex gap-2 rounded-xl border bg-surface/50 p-1.5">{tab("customers", "Clientes", customers?.length ?? 0)}{tab("agencies", "Agencias", agencies?.length ?? 0)}</div>
    {view === "agencies" ? <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.4fr]">
      <GlassPanel className="p-5"><h2 className="font-semibold">Nueva agencia</h2><p className="mt-1 text-xs text-muted">Configura crédito, comisión, moneda y condiciones de pago.</p><form action={createAgency} className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className={label}>Código<input name="code" required placeholder="LUNA-ES" className={input}/></label><label className={label}>Nombre<input name="name" required placeholder="Luna Travel" className={input}/></label>
        <label className={label}>Mercado<input name="market" required placeholder="España" className={input}/></label><label className={label}>País<input name="country" required placeholder="ES" className={input}/></label>
        <label className={label}>Correo<input name="email" type="email" className={input}/></label><label className={label}>Teléfono<input name="phone" className={input}/></label>
        <label className={label}>Moneda<input name="currency" defaultValue="USD" maxLength={3} className={input}/></label><label className={label}>Límite de crédito<input name="credit_limit" type="number" min="0" defaultValue="10000" className={input}/></label>
        <label className={label}>Comisión %<input name="commission_pct" type="number" min="0" max="100" step="0.01" defaultValue="10" className={input}/></label><label className={label}>Pago en días<input name="payment_terms_days" type="number" min="0" defaultValue="15" className={input}/></label>
        <SubmitButton className="sm:col-span-2">Guardar agencia</SubmitButton>
      </form></GlassPanel>
      <GlassPanel className="overflow-hidden"><div className="p-5"><h2 className="font-semibold">Cuentas B2B</h2><p className="mt-1 text-xs text-muted">Cada agencia dispone de tarifario y portal reservable propios.</p></div><div className="divide-y">{agencies?.map((agency) => <div key={agency.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto]"><div><p className="font-medium">{agency.name}</p><p className="text-xs text-muted">{agency.code} · {agency.market}, {agency.country}</p><p className="mt-2 font-mono text-[11px] text-teal-700">/agencia/{agency.portal_slug}</p></div><div className="flex flex-wrap items-center gap-3 sm:justify-end"><p className="text-sm">{agency.currency} · {agency.commission_pct}% comisión</p><Link href={`/agencia/${agency.portal_slug}`} target="_blank" className="rounded-lg border px-3 py-2 text-xs font-semibold text-accent">Ver portal ↗</Link><Link href={`/products?agency=${agency.id}&view=agency-rates`} className="text-xs font-semibold text-accent">Configurar precios →</Link></div></div>)}</div></GlassPanel>
    </div> : <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.4fr]">
      <GlassPanel className="p-5"><h2 className="font-semibold">Nuevo cliente</h2><p className="mt-1 text-xs text-muted">Viajero o comprador directo B2C.</p><form action={createCustomer} className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className={label}>Nombre<input name="first_name" required className={input}/></label><label className={label}>Apellido<input name="last_name" required className={input}/></label>
        <label className={label}>Correo<input name="email" type="email" className={input}/></label><label className={label}>Teléfono<input name="phone" className={input}/></label>
        <label className={label}>Nacionalidad<input name="nationality" className={input}/></label><label className={label}>Idioma<select name="language" defaultValue="es" className={input}><option value="es">Español</option><option value="en">Inglés</option><option value="fr">Francés</option></select></label>
        <SubmitButton className="sm:col-span-2">Guardar cliente</SubmitButton>
      </form></GlassPanel>
      <GlassPanel className="overflow-hidden"><div className="p-5"><h2 className="font-semibold">Clientes directos</h2></div><div className="divide-y">{customers?.map((customer) => <div key={customer.id} className="p-4"><p className="font-medium">{customer.first_name} {customer.last_name}</p><p className="text-xs text-muted">{customer.email || "Sin correo"} · {customer.phone || "Sin teléfono"} · {customer.language?.toUpperCase()}</p></div>)}</div></GlassPanel>
    </div>}
  </AppShell>;
}
