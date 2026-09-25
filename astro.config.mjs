import { defineConfig } from 'astro/config';

export default defineConfig({
  // Dominio público: genera URLs absolutas para og:image / og:url (vista previa al compartir).
  site: 'https://tu-ruta-rock.v1tr0.com',
  // La barra de desarrollo tapaba el botón "Mi ruta" en celular.
  devToolbar: { enabled: false },
});
