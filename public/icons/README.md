# PWA Icons

Para generar los iconos PWA, puedes usar herramientas online o ImageMagick.

## Opción 1: Herramienta Online (Recomendado)

1. Ve a https://www.pwabuilder.com/imageGenerator
2. Sube el logo de MundoSolar (preferiblemente SVG o PNG de alta resolución)
3. Descarga el paquete de iconos
4. Extrae los archivos en esta carpeta

## Opción 2: ImageMagick (desde terminal)

Si tienes ImageMagick instalado:

```bash
# Desde la carpeta del proyecto
# Asumiendo que tienes logo.png en public/assets/logos/

cd public/icons

# Generar todos los tamaños necesarios
for size in 72 96 128 144 152 192 384 512; do
  magick ../assets/logos/logo.png -resize ${size}x${size} icon-${size}x${size}.png
done
```

## Opción 3: Canva o Figma

1. Exporta el logo en los siguientes tamaños:
   - 72x72
   - 96x96
   - 128x128
   - 144x144
   - 152x152
   - 192x192
   - 384x384
   - 512x512

2. Nombra los archivos como `icon-{size}x{size}.png`

## Iconos Requeridos

- ✅ icon-72x72.png
- ✅ icon-96x96.png
- ✅ icon-128x128.png
- ✅ icon-144x144.png
- ✅ icon-152x152.png
- ✅ icon-192x192.png (Principal para Android)
- ✅ icon-384x384.png
- ✅ icon-512x512.png (Splash screen)

## Screenshots (Opcional pero Recomendado)

En `public/screenshots/`:
- `dashboard.png` - 1280x720px (vista desktop)
- `mobile.png` - 540x720px (vista mobile)

Estos screenshots se muestran cuando el usuario instala la PWA desde la tienda o navegador.
