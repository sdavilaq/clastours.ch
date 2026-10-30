# clastours.ch
Sitio web Clas Tours, en español (raíz), alemán (`/de/`), inglés (`/en/`) y francés (`/fr/`).

## Cómo se edita el sitio

Los archivos `.html` de la raíz, de `de/` y de `en/` **se generan**: no se editan a mano.
La fuente está en `src/`:

| Qué quieres cambiar | Dónde |
|---|---|
| Un texto (en español) | `src/i18n/es.json` |
| Diseño, estructura, scripts | `src/pages/*.html` |
| Precios (CHF) | `src/data.json` (se propagan a todas las páginas e idiomas) |
| Traducciones | `src/i18n/de.json`, `src/i18n/en.json`, `src/i18n/fr.json` |

Después de editar, desde la raíz del repo:

```
python3 build.py            # regenera las 3 versiones y el sitemap.xml
python3 build.py --status   # lista los textos sin traducir o desactualizados
```

### Flujo cuando cambias un texto
1. Cambias el texto en `src/i18n/es.json` (o la plantilla en `src/pages/`).
2. Corres `python3 build.py --status`: marca como **desactualizados** los textos de DE/EN/FR cuyo original en español cambió.
3. Se traducen solo esos textos y se importan con `python3 build.py --import de archivo.json` (y `en`, `fr`).
4. `python3 build.py` y commit de todo (fuente + archivos generados).

Mientras una traducción falte o esté desactualizada, esa página muestra el texto en español como respaldo, nunca un hueco.

### Notas
- Los textos de los scripts (alertas, widget del tiempo, mensaje de WhatsApp) están en `es.json` con prefijo `js.`.
- Los precios nunca van escritos a mano en los textos: se usa `{{p.ruta}}` (precio) o `{{g.ruta}}` (grupo 7+).
- `clas_tours_4xA4.html` (flyer) no se traduce ni se genera.
- Tras publicar: purgar la caché de Cloudflare (Purge Everything).
- Las traducciones de los Términos y Condiciones son informativas; en caso de discrepancia prevalece la versión en español.
