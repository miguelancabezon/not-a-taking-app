# Despliegue en Neocities — Not-a taking app

El proyecto está configurado para compilarse como sitio 100 % estático compatible con **Neocities** (rutas relativas `./`, sin *sourcemaps* y con `not_found.html` generado automáticamente).

## 1. Generar la carpeta lista para subir

```bash
npm install
npm run build
```

Esto crea la carpeta `dist/` con:
- `index.html` y `not_found.html`
- `favicon.svg`
- `assets/` (CSS y JS empaquetados con rutas relativas)

## 2. Subir a Neocities

### Opción A: Desde el panel web de Neocities
1. Entra en [neocities.org/dashboard](https://neocities.org/dashboard).
2. Arrastra **el contenido interior** de la carpeta `dist/` (`index.html`, `not_found.html`, `favicon.svg` y la carpeta `assets/`) a la raíz de tu sitio (o a una subcarpeta como `/not-a-taking-app/`, ya que las rutas son relativas).

### Opción B: Con la CLI oficial de Neocities
```bash
neocities push dist
```

## 3. Sincronización en la nube (opcional)
El guardado automático local y entre pestañas funciona directamente en Neocities sin configuración adicional.
Si además deseas usar el inicio de sesión con Google y Firestore desde tu dominio de Neocities:
1. Abre **Firebase Console → Authentication → Settings → Authorized domains**.
2. Añade tu dominio de Neocities (por ejemplo, `tu-sitio.neocities.org`).
