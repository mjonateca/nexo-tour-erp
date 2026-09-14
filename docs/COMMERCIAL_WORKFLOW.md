# Flujo comercial y operativo

## Referencia sectorial

Nexo Tour adopta el flujo integrado habitual en Tourplan para DMCs y operadores: catálogo y contratación → cotización → reserva → confirmación de servicios → operación → factura/cobro. En Tourplan, cotizaciones y reservas comparten el mismo expediente y se diferencian principalmente por estado; al convertir una cotización, se revisan tarifas y disponibilidad y el precio queda ligado al expediente.

Fuentes de contraste:

- https://www.tourplan.com/es/productos/
- https://trainingguides.tourplan.com/Fastbook/Content/Tourplan%20iS%20V2/Default.htm
- https://help.tourplan.com/resources/knowledge-base/Knowledge%20Base/Core%20Products/Bookings%20%26%20Quotes/Quote%20Processing
- https://usermanuals.tourplan.com/V2_5/Content/NX%20Product/A-Getting%20Started%20with%20Product/A%20-%20Getting%20Started%20with%20Product.htm

## Cómo entra una reserva

1. Se identifica el canal: agencia B2B o cliente directo B2C.
2. Se seleccionan producto, fecha y pasajeros.
3. El motor busca el coste contractual vigente del proveedor.
4. Si existe una tarifa de venta para la agencia, se usa; si no, se aplica el margen general.
5. La cotización guarda una instantánea explicable de coste, venta, cantidad y origen del precio.
6. Al convertirla, se crean reserva, servicios solicitados, tarea de confirmación y actividad de calendario.
7. La operación asigna responsables y confirma servicios.
8. Finanzas emite la factura desde el total congelado de la reserva.

## Maestros comerciales

- **Cliente:** persona que viaja o compra directamente; incluye contacto, idioma y nacionalidad.
- **Agencia:** cuenta comercial B2B; incluye mercado, moneda, crédito, comisión y plazo de pago.
- **Tarifa de agencia:** precio de venta por agencia, producto, unidad y periodo de vigencia.
- **Contrato de proveedor:** coste de compra, moneda, unidad y vigencia.

Esta separación evita mezclar al viajero con el pagador comercial y permite analizar ventas y rentabilidad por agencia.
