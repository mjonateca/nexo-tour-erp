import { AppShell } from "@/components/app-shell";
import { EmptyState, PageHeader } from "@/components/domain/ui";
import { EntityTable, type EntityRow } from "@/components/domain/entity-table";
import { createClient } from "@/lib/supabase/server";

const info: Record<string, { title: string; description: string; eyebrow: string; table?: string; columns?: string }> = {
  sales: { title: "Espacio comercial", description: "Cotizaciones activas de Nexo Tour.", eyebrow: "Ventas", table: "quotes", columns: "reference,status,travel_start,travel_end,currency,total_sale" },
  crm: { title: "Clientes y agencias", description: "Registros comerciales del tenant actual.", eyebrow: "CRM", table: "customers", columns: "first_name,last_name,email,language" },
  products: { title: "Catálogo de productos", description: "Productos de proveedores e inventario comercial en vivo.", eyebrow: "Producto", table: "products", columns: "code,type,name,destination,status,default_currency" },
  operations: { title: "Control operacional", description: "Tareas generadas para reservas activas.", eyebrow: "Operaciones", table: "operations_tasks", columns: "title,due_at,status,priority" },
  finance: { title: "Espacio financiero", description: "Facturas emitidas y control de pagos.", eyebrow: "Finanzas", table: "invoices", columns: "reference,status,currency,total_amount,due_date" },
  administration: { title: "Administración", description: "Miembros del tenant y base de accesos.", eyebrow: "Plataforma", table: "profiles", columns: "display_name,created_at" },
  settings: { title: "Configuración", description: "Configuración del tenant e integraciones.", eyebrow: "Plataforma" }
};
export default async function ModulePage({ params }: { params: Promise<{ module: string }> }) { const { module } = await params; const config = info[module] ?? { title: "Espacio de trabajo", description: "Este espacio está en configuración.", eyebrow: "Nexo Tour" }; let rows: EntityRow[] = []; if (config.table && config.columns) { const supabase = await createClient(); const { data } = await supabase.from(config.table).select(config.columns).limit(25); rows = (data ?? []) as unknown as EntityRow[]; } return <AppShell><PageHeader eyebrow={config.eyebrow} title={config.title} description={config.description}/><div className="mt-6">{config.table ? <EntityTable title={config.title} description="Datos cargados desde Supabase bajo RLS por tenant." rows={rows}/> : <EmptyState title="Módulo base preparado" detail="Este espacio quedará disponible al implementar el dominio correspondiente."/>}</div></AppShell>; }
