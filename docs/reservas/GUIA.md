# Sistema de solicitudes: cómo activarlo y usarlo

## Cómo funciona

1. La persona rellena un formulario del sitio (calendario, contacto o inicio) y pulsa **Enviar**.
2. El sitio manda los datos a un script de Google (gratis) que:
   - añade una fila a tu hoja de cálculo **Solicitudes**,
   - te envía un email a `info@clastours.ch` con todos los datos (si respondes ese email, le respondes al cliente),
   - le envía al cliente un acuse de recibo automático en su idioma (ES, DE o EN). Dice claramente que **no** es una reserva confirmada.
3. Si falla el envío, a la persona se le muestra un aviso con un botón para escribirte por WhatsApp. Nadie se pierde.
4. Mientras el script no esté activado, los formularios siguen funcionando como antes (abren WhatsApp).

Costo: 0 CHF. Cuota de Google: unos 100 emails al día con una cuenta gratuita (cada solicitud usa 2), de sobra para este volumen.

## Activarlo (unos 10 minutos, una sola vez)

Hazlo con la cuenta de Google que quieras usar para el negocio.

1. Entra a <https://sheets.google.com> y crea una hoja nueva. Ponle de nombre **Clas Tours – Solicitudes**.
2. Menú **Extensiones → Apps Script**.
3. Borra el código que aparece y pega todo el contenido de `docs/reservas/Code.gs`. Guarda (icono del disquete).
4. Arriba, en el selector de funciones, elige **prueba** y pulsa **Ejecutar**. La primera vez Google pide permisos (hoja de cálculo y enviar emails): acepta. Si sale "Google no ha verificado esta app", pulsa *Avanzado → Ir a (proyecto)*: es tu propio script.
5. Revisa que te llegaron **dos emails** (el aviso y el acuse en alemán) a `info@clastours.ch`, y que en la hoja apareció la pestaña **Solicitudes** con una fila.
6. Botón **Implementar → Nueva implementación**:
   - Tipo: **Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
7. Pulsa **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).
8. Pásame esa URL. La pongo en `src/data.json` (`booking.endpoint`), regenero el sitio y queda activo en los 3 idiomas.

### Cosas que conviene saber
- Los emails salen desde la dirección de Gmail de la cuenta que usaste (con el nombre "Clas Tours" y *responder a* `info@clastours.ch`). Para que salgan desde `info@clastours.ch` hay que configurar ese alias en Gmail ("Enviar como"); se puede hacer después.
- Si cambias el código del script, hay que volver a **Implementar → Administrar implementaciones → editar → Nueva versión**. La URL no cambia.
- La columna **Estado** de la hoja es para ti: Nueva → Confirmada → Pagada → Realizada (o Cancelada). Para las salidas con mínimo de 2 personas, ordena o filtra por *Ruta* y *Fecha pedida* y mira cuántos van a lo mismo.
- Los datos viven en tu Google Drive. Por eso el artículo 10 de los Términos y Condiciones ahora lo menciona.

## Flujo de una reserva (recomendado)

1. Llega la solicitud (email + fila en la hoja, estado **Nueva**). La persona recibe el acuse automático.
2. Respondes en menos de 24 h por email o WhatsApp: propones o confirmas fecha. Si aún no hay 2 personas, lo dices y dejas la solicitud abierta.
3. Cuando hay mínimo de 2 y fecha acordada: envías la **confirmación** (plantillas en `plantillas-confirmacion.md`) con punto de encuentro, hora, qué llevar y datos de pago. Estado → **Confirmada**.
4. Cobro por transferencia, Twint o QR de PostFinance antes de la actividad (según los Términos). Estado → **Pagada**.
5. Unos días antes: recordatorio con el pronóstico y la hora exacta.
6. Después: gracias + pedir reseña en Google (cuando tengas el perfil de empresa).

## Siguiente paso posible (opcional)
Si más adelante quieres cobrar con enlace de pago (Twint o tarjeta con Stripe), se añade un enlace por ruta en la plantilla de confirmación. No hace falta tocar el sitio.
