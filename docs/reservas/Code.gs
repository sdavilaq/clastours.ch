/**
 * Clas Tours – recepción de solicitudes de reserva
 *
 * Qué hace cada vez que alguien envía un formulario del sitio:
 *  1. Guarda una fila en la hoja "Solicitudes"
 *  2. Te manda un email a OWNER_EMAIL con todos los datos (responder = responder al cliente)
 *  3. Le manda al cliente un email automático, en su idioma (ES/DE/EN/FR), diciendo que recibimos la solicitud
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
               'Nivel', 'Vegetariano', 'Gluten/lactosa', 'Mensaje', 'Fotos OK', 'Idioma', 'Origen', 'Notas', 'T&C aceptados', 'Novedades OK'];

// Límites diarios: protegen la cuota de Gmail (~100 correos/día) y evitan que alguien use el formulario para spam.
// Lo que pase de estos topes se ignora en silencio (no se guarda ni se envía).
var LIMITS = { rowsPerDay: 60, autoRepliesPerDay: 30, autoRepliesPerEmail: 2 };
var TZ = 'Europe/Zurich';

// Cuenta usos por día en las propiedades del script; devuelve false si ya se llegó al tope
function bump_(key, max) {
  var props = PropertiesService.getScriptProperties();
  var day = Utilities.formatDate(new Date(), TZ, 'yyyyMMdd');
  var k = 'n_' + day + '_' + key;
  var n = Number(props.getProperty(k) || 0);
  if (n >= max) return false;
  props.setProperty(k, String(n + 1));
  return true;
}

// Borra los contadores de días anteriores
function cleanup_() {
  var props = PropertiesService.getScriptProperties();
  var day = Utilities.formatDate(new Date(), TZ, 'yyyyMMdd');
  var all = props.getProperties();
  for (var k in all) { if (k.indexOf('n_') === 0 && k.indexOf('n_' + day + '_') !== 0) props.deleteProperty(k); }
}

function hash_(txt) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(txt).toLowerCase()).map(function (b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

// Escribe la fila como TEXTO: así nada que empiece por = + - @ se ejecuta como fórmula (y el "+" del teléfono se conserva)
function appendSafe_(sh, vals) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var row = sh.getLastRow() + 1;
    var r = sh.getRange(row, 1, 1, vals.length);
    r.setNumberFormat('@');
    r.setValues([vals.map(function (v) { return v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd HH:mm') : String(v); })]);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput('Clas Tours · formulario activo');
}

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    d = clean_(d);
    if (!d) return ok_();                       // vacío o sospechoso: se ignora en silencio

    if (!bump_('rows', LIMITS.rowsPerDay)) return ok_();   // demasiadas solicitudes hoy: se ignora
    if (Math.random() < 0.05) cleanup_();

    appendSafe_(sheet_(), [
      new Date(), 'Nueva', d.date, d.route, d.people, d.name, d.email, d.whatsapp,
      d.level, d.vegetarian ? 'Sí' : '', d.allergy ? 'Sí' : '', d.message, d.photos ? 'Sí' : 'No', d.lang, d.source, '',
      d.terms ? ('Sí · v' + (d.termsVersion || '?')) : 'No', d.newsletter ? 'Sí' : 'No'
    ]);

    notifyOwner_(d);
    // acuse al cliente: máx. 2 por email al día y 30 en total (evita usar el formulario para mandar spam a terceros)
    if (d.email && (d.email.toLowerCase() === OWNER_EMAIL || bump_('em_' + hash_(d.email), LIMITS.autoRepliesPerEmail)) && bump_('auto', LIMITS.autoRepliesPerDay)) autoReply_(d);
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
  function one(v, n) { return s(v, n).replace(/[\r\n\t]+/g, ' '); }
  var out = {
    name: one(d.name, 120), email: one(d.email, 160), whatsapp: one(d.whatsapp, 40), route: one(d.route, 160),
    date: one(d.date, 120), people: one(d.people, 40), level: one(d.level, 80), message: s(d.message, 2000),
    vegetarian: !!d.vegetarian, allergy: !!d.allergy, photos: !!d.photos,
    terms: !!d.terms, termsVersion: s(d.termsVersion, 12), newsletter: !!d.newsletter,
    lang: ['es', 'de', 'en', 'fr'].indexOf(d.lang) >= 0 ? d.lang : 'es', source: one(d.source, 30)
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
  lines.push('Términos y Condiciones: ' + (d.terms ? 'aceptados (v' + (d.termsVersion || '?') + ')' : 'NO marcados'));
  lines.push('Novedades por correo: ' + (d.newsletter ? 'SÍ (consentimiento dado)' : 'no'));
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
    terms: 'Términos y Condiciones aceptados:', termsUrl: 'https://www.clastours.ch/clastours-legal.html', news: 'Si marcaste la casilla de novedades, te escribiré de vez en cuando sobre nuevas rutas y salidas; puedes darte de baja respondiendo a este correo.',
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
    terms: 'Akzeptierte AGB:', termsUrl: 'https://www.clastours.ch/de/clastours-legal.html', news: 'Falls du das Kästchen für Neuigkeiten angekreuzt hast, schreibe ich dir ab und zu zu neuen Routen und Terminen; du kannst dich jederzeit abmelden, indem du auf diese E-Mail antwortest.',
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
    terms: 'Terms and Conditions you accepted:', termsUrl: 'https://www.clastours.ch/en/clastours-legal.html', news: 'If you ticked the news box, I will write to you now and then about new routes and departures; you can unsubscribe at any time by replying to this email.',
    route: 'Tour', date: 'Date', people: 'People', msg: 'Message'
  },
  fr: {
    subject: 'Nous avons bien reçu votre demande · Clas Tours',
    hi: 'Bonjour {name},',
    body: 'Merci de votre message. Nous avons bien reçu votre demande et je vous réponds dans les 24 heures pour confirmer la date et les détails.',
    sum: 'Voici ce que nous avons reçu :',
    note: 'Important : ceci est uniquement un accusé de réception, et non une réservation confirmée. Les sorties ont lieu à partir de 2 personnes ; la réservation est confirmée lorsque je vous le confirme par écrit et que le paiement est convenu.',
    wa: 'Si c\'est urgent, écrivez-moi par WhatsApp :',
    bye: 'Cordiales salutations,', sign: 'Santiago · Clas Tours',
    terms: 'Conditions générales acceptées :', termsUrl: 'https://www.clastours.ch/fr/clastours-legal.html', news: 'Si vous avez coché la case des nouvelles, je vous écrirai de temps en temps au sujet des nouveaux itinéraires et départs ; vous pouvez vous désinscrire à tout moment en répondant à cet e-mail.',
    route: 'Itinéraire', date: 'Date', people: 'Personnes', msg: 'Message'
  }
};

function esc_(v) { return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// Firma de los emails automáticos (misma que usas en tus correos). LOGO_URL: dirección pública de la imagen del logo; vacío = sin logo
var LOGO_URL = '';
var SIG = {
  lines: ['Santiago Dávila Quiroz', 'CLAS Tours by Davila Quiroz', '\u201eCamina Los Alpes Suizos\u201c',
          'Quellmattstrasse 11, 2563 Ipsach, Schweiz', '+41 77 460 36 41', 'info@clastours.ch', 'www.clastours.ch | @clastours']
};

function sigText_() { return SIG.lines.join('\n'); }
function sigHtml_() {
  return '<div style="margin-top:18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#1a2a33">' +
    '<b>' + SIG.lines[0] + '<br>' + SIG.lines[1] + '</b><br><i>' + SIG.lines[2] + '</i><br>' +
    '&#128205; ' + SIG.lines[3] + '<br>&#128222; ' + SIG.lines[4] + '<br>' +
    '&#9993; <a href="mailto:info@clastours.ch">info@clastours.ch</a><br>' +
    '&#127760; <a href="https://www.clastours.ch">www.clastours.ch</a> | &#128248; <a href="https://www.instagram.com/clastours">@clastours</a>' +
    (LOGO_URL ? '<br><img src="' + LOGO_URL + '" alt="Clas Tours" width="320" style="margin-top:8px;border:0">' : '') + '</div>';
}

function autoReply_(d) {
  var t = TEXTS[d.lang] || TEXTS.es;
  var rows = [];
  if (d.route)   rows.push(t.route + ': ' + d.route);
  if (d.date)    rows.push(t.date + ': ' + d.date);
  if (d.people)  rows.push(t.people + ': ' + d.people);
  if (d.message) rows.push(t.msg + ': ' + d.message);
  var legal = [d.terms ? t.terms + ' ' + t.termsUrl : t.termsUrl]; if (d.newsletter) legal.push(t.news);
  var text = [t.hi.replace('{name}', d.name), '', t.body, '', t.sum, rows.join('\n'), '', t.note, '', legal.join('\n'), '', t.wa + ' ' + WHATSAPP, '', t.bye, '', sigText_()].join('\n');
  var html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1a2a33;max-width:560px">' +
    '<p>' + esc_(t.hi.replace('{name}', d.name)) + '</p><p>' + esc_(t.body) + '</p><p><b>' + esc_(t.sum) + '</b><br>' +
    rows.map(esc_).join('<br>') + '</p><p style="background:#f3efe9;padding:10px 12px;border-radius:4px">' + esc_(t.note) + '</p>' +
    '<p style="font-size:13px;color:#4a5a63">' + (d.terms ? esc_(t.terms) + ' ' : '') + '<a href="' + t.termsUrl + '">' + esc_(t.termsUrl.replace('https://', '')) + '</a>' + (d.newsletter ? '<br>' + esc_(t.news) : '') + '</p>' +
    '<p>' + esc_(t.wa) + ' <a href="' + WHATSAPP + '">WhatsApp</a></p><p>' + esc_(t.bye) + '</p>' + sigHtml_() + '</div>';
  send_({ to: d.email, subject: t.subject, body: text, htmlBody: html, name: 'Clas Tours', replyTo: OWNER_EMAIL });
}

// Para probar sin usar el sitio: Ejecutar > prueba (te llegan los dos emails a ti)
function prueba() {
  doPost({ postData: { contents: JSON.stringify({
    source: 'prueba', lang: 'de', route: 'Creux du Van · auf Anfrage', date: 'Samstag im Juni', name: 'Prueba Clas Tours',
    email: OWNER_EMAIL, whatsapp: '+41770000000', people: '2', message: 'Dies ist ein Test.', photos: true, terms: true, termsVersion: '1.1', newsletter: true }) } });
}
