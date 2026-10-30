# Sistema de solicitudes: cómo activarlo y usarlo

## Cómo funciona

1. La persona rellena un formulario del sitio (calendario, contacto o inicio) y pulsa **Enviar**.
2. El sitio manda los datos a un script de Google (gratis) que:
   - añade una fila a tu hoja de cálculo **Solicitudes**,
   - te envía un email a `info@clastours.ch` con todos los datos (si respondes ese email, le respondes al cliente),
   - le envía al cliente un acuse de recibo automático en su idioma (ES, DE, EN o FR). Dice claramente que **no** es una reserva confirmada.
3. Si falla el envío, a la persona se le muestra un aviso con un botón para escribirte por WhatsApp. Nadie se pierde.
4. Mientras el script no esté activado, los formularios siguen funcionando como antes (abren WhatsApp).

Costo: 0 CHF. Cuota de Google: unos 100 emails al día con una cuenta gratuita (cada solicitud usa 2), de sobra para este volumen.

## Activarlo (unos 15 minutos, una sola vez)

Hazlo con la cuenta de Google que quieras usar para el negocio.

### A. Enviar desde info@clastours.ch (una vez, en Gmail)

Para que los emails automáticos salgan desde `info@clastours.ch` y no desde tu Gmail, esa dirección se añade como alias en Gmail **usando el servidor de Hostpoint**. Así el email sale realmente por Hostpoint (con su SPF/DKIM) y no cae en spam.

1. Gmail (en el navegador) → ⚙ **Ver todos los ajustes → Cuentas e importación → Enviar como → Añadir otra dirección de correo**.
2. Nombre: `Clas Tours`. Dirección: `info@clastours.ch`. Pulsa *Siguiente paso*.
3. Servidor SMTP: `asmtp.mail.hostpoint.ch` · Puerto: `465` (SSL) · Usuario: `info@clastours.ch` · Contraseña: la del buzón en Hostpoint (la del Control Panel). Pulsa *Añadir cuenta*.
4. Gmail envía un código de verificación a `info@clastours.ch`; ábrelo en tu buzón de Hostpoint y escríbelo en Gmail.

Datos del servidor según [Hostpoint](https://support.hostpoint.ch/en/technical/e-mail/frequently-asked-questions/e-mail-settings-at-a-glance). Si no haces este paso, todo funciona igual, pero los emails salen desde tu Gmail (con *responder a* `info@clastours.ch`).

### B. Script de Google

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
- Con el paso A hecho, los emails salen desde `info@clastours.ch`. En la prueba del paso 4 Google pide un permiso más (enviar correo con Gmail): es normal.
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
