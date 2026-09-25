import { defineConfig } from 'astro/config';

export default defineConfig({
  // La barra de desarrollo tapaba el botón "Mi ruta" en celular.
  devToolbar: { enabled: false },
});
