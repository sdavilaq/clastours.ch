/**
 * Clas Tours – recepción de solicitudes de reserva
 *
 * Qué hace cada vez que alguien envía un formulario del sitio:
 *  1. Guarda una fila en la hoja "Solicitudes"
 *  2. Te manda un email a OWNER_EMAIL con todos los datos (responder = responder al cliente)
 *  3. Le manda al cliente un email automático, en su idioma (ES/DE/EN), diciendo que recibimos la solicitud
 *
 * Los emails salen desde info@clastours.ch si esa dirección está configurada como alias "Enviar como" en la
 * cuenta de Gmail que ejecuta el script (ver GUIA.md, paso A). Si no, salen desde la cuenta de Gmail.
 *
 * Instalación: ver GUIA.md
 */

var OWNER_EMAIL = 'info@clastours.ch';
var SHEET_NAME  = 'Solicitudes';
var WHATSAPP    = 'https://wa.me/41774603641';
var HEADERS = ['Recibida', 'Estado', 'Fecha pedida', 'Ruta', 'Personas', 'Nombre', 'Email', 'WhatsApp',
               'Nivel', 'Vegetariano', 'Gluten/lactosa', 'Mensaje', 'Fotos OK', 'Idioma', 'Origen', 'Notas'];

function doGet() {
  return ContentService.createTextOutput('Clas Tours · formulario activo');
}

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    d = clean_(d);
    if (!d) return ok_();                       // vacío o sospechoso: se ignora en silencio

    var sheet = sheet_();
    sheet.appendRow([
      new Date(), 'Nueva', d.date, d.route, d.people, d.name, d.email, d.whatsapp,
      d.level, d.vegetarian ? 'Sí' : '', d.allergy ? 'Sí' : '', d.message, d.photos ? 'Sí' : 'No', d.lang, d.source, ''
    ]);

    notifyOwner_(d);
    if (d.email) autoReply_(d);
  } catch (err) {
    try { MailApp.sendEmail(OWNER_EMAIL, 'Error en el formulario de clastours.ch', String(err) + '\n\n' + (e && e.postData ? e.postData.contents : '')); } catch (x) {}
  }
  return ok_();
}

// Envía desde info@clastours.ch si está como alias en Gmail; si no, desde la cuenta de Gmail
function send_(o) {
  var from = '';
  try { if (GmailApp.getAliases().indexOf(OWNER_EMAIL) >= 0) from = OWNER_EMAIL; } catch (e) {}
  if (from) {
    var opt = { from: from, name: o.name, replyTo: o.replyTo };
    if (o.htmlBody) opt.htmlBody = o.htmlBody;
    GmailApp.sendEmail(o.to, o.subject, o.body, opt);
  } else {
    MailApp.sendEmail(o);
  }
}

function ok_() { return ContentService.createTextOutput('ok'); }

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

// Valida y recorta los datos (el endpoint es público: cualquiera puede llamarlo)
function clean_(d) {
  function s(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().substring(0, n); }
  var out = {
    name: s(d.name, 120), email: s(d.email, 160), whatsapp: s(d.whatsapp, 40), route: s(d.route, 160),
    date: s(d.date, 120), people: s(d.people, 40), level: s(d.level, 80), message: s(d.message, 2000),
    vegetarian: !!d.vegetarian, allergy: !!d.allergy, photos: !!d.photos,
    lang: ['es', 'de', 'en'].indexOf(d.lang) >= 0 ? d.lang : 'es', source: s(d.source, 30)
  };
  if (!out.name) return null;
  if (!out.email && !out.whatsapp) return null;
  if (out.email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(out.email)) out.email = '';
  if (!out.email && !out.whatsapp) return null;
  return out;
}

function notifyOwner_(d) {
  var lines = [
    'Nueva solicitud desde clastours.ch (' + d.source + ', idioma ' + d.lang.toUpperCase() + ')', '',
    'Ruta: ' + d.route, 'Fecha pedida: ' + (d.date || '—'), 'Personas: ' + (d.people || '—'), '',
    'Nombre: ' + d.name, 'Email: ' + (d.email || '—'), 'WhatsApp: ' + (d.whatsapp || '—')
  ];
  if (d.level) lines.push('Nivel: ' + d.level);
  if (d.vegetarian) lines.push('Vegetariano: sí');
  if (d.allergy) lines.push('Gluten/lactosa: sí');
  if (d.message) lines.push('', 'Mensaje:', d.message);
  lines.push('', 'Fotos con fines promocionales: ' + (d.photos ? 'autorizadas' : 'no autorizadas'));
  if (d.whatsapp) lines.push('Responder por WhatsApp: https://wa.me/' + d.whatsapp.replace(/[^0-9]/g, ''));
  var opts = { to: OWNER_EMAIL, subject: 'Solicitud: ' + (d.route || 'Clas Tours') + ' · ' + d.name, body: lines.join('\n'), name: 'Formulario clastours.ch' };
  if (d.email) opts.replyTo = d.email;
  send_(opts);
}

var TEXTS = {
  es: {
    subject: 'Recibimos tu solicitud · Clas Tours',
    hi: 'Hola {name},',
    body: 'Gracias por escribirnos. Recibimos tu solicitud y te respondo en menos de 24 horas para confirmar la fecha y los detalles.',
    sum: 'Esto es lo que recibimos:',
    note: 'Importante: esto es solo el acuse de recibo, no una reserva confirmada. Las salidas se hacen con un mínimo de 2 personas; la reserva queda confirmada cuando te lo confirmo por escrito y se coordina el pago.',
    wa: 'Si es urgente, escríbeme por WhatsApp:',
    bye: 'Un abrazo,', sign: 'Santiago · Clas Tours',
    route: 'Ruta', date: 'Fecha', people: 'Personas', msg: 'Mensaje'
  },
  de: {
    subject: 'Deine Anfrage ist eingegangen · Clas Tours',
    hi: 'Hallo {name},',
    body: 'Danke für deine Nachricht. Deine Anfrage ist eingegangen, und ich melde mich innerhalb von 24 Stunden, um das Datum und die Details zu bestätigen.',
    sum: 'Das haben wir erhalten:',
    note: 'Wichtig: Dies ist nur die Eingangsbestätigung, noch keine bestätigte Buchung. Die Touren finden mit mindestens 2 Personen statt; die Buchung ist verbindlich, sobald ich sie schriftlich bestätige und die Zahlung vereinbart ist.',
    wa: 'Wenn es dringend ist, schreib mir per WhatsApp:',
    bye: 'Herzliche Grüsse,', sign: 'Santiago · Clas Tours',
    route: 'Tour', date: 'Datum', people: 'Personen', msg: 'Nachricht'
  },
  en: {
    subject: 'We received your request · Clas Tours',
    hi: 'Hi {name},',
    body: 'Thanks for getting in touch. We received your request and I will reply within 24 hours to confirm the date and the details.',
    sum: 'Here is what we received:',
    note: 'Please note: this is only an acknowledgement, not a confirmed booking. Tours run with a minimum of 2 people; the booking is confirmed once I confirm it in writing and payment is arranged.',
    wa: 'If it is urgent, message me on WhatsApp:',
    bye: 'Best regards,', sign: 'Santiago · Clas Tours',
    route: 'Tour', date: 'Date', people: 'People', msg: 'Message'
  }
};

function esc_(v) { return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function autoReply_(d) {
  var t = TEXTS[d.lang] || TEXTS.es;
  var rows = [];
  if (d.route)   rows.push(t.route + ': ' + d.route);
  if (d.date)    rows.push(t.date + ': ' + d.date);
  if (d.people)  rows.push(t.people + ': ' + d.people);
  if (d.message) rows.push(t.msg + ': ' + d.message);
  var text = [t.hi.replace('{name}', d.name), '', t.body, '', t.sum, rows.join('\n'), '', t.note, '', t.wa + ' ' + WHATSAPP, '', t.bye, t.sign].join('\n');
  var html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1a2a33;max-width:560px">' +
    '<p>' + esc_(t.hi.replace('{name}', d.name)) + '</p><p>' + esc_(t.body) + '</p><p><b>' + esc_(t.sum) + '</b><br>' +
    rows.map(esc_).join('<br>') + '</p><p style="background:#f3efe9;padding:10px 12px;border-radius:4px">' + esc_(t.note) + '</p>' +
    '<p>' + esc_(t.wa) + ' <a href="' + WHATSAPP + '">WhatsApp</a></p><p>' + esc_(t.bye) + '<br>' + esc_(t.sign) + '</p></div>';
  send_({ to: d.email, subject: t.subject, body: text, htmlBody: html, name: 'Clas Tours', replyTo: OWNER_EMAIL });
}

// Para probar sin usar el sitio: Ejecutar > prueba (te llegan los dos emails a ti)
function prueba() {
  doPost({ postData: { contents: JSON.stringify({
    source: 'prueba', lang: 'de', route: 'Creux du Van · auf Anfrage', date: 'Samstag im Juni', name: 'Prueba Clas Tours',
    email: OWNER_EMAIL, whatsapp: '+41770000000', people: '2', message: 'Dies ist ein Test.', photos: true }) } });
}
