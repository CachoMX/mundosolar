# Troubleshooting - MundoSolar Mobile App

## Error: "expected dynamic type 'boolean', but had type 'string'"

Este error ocurre cuando una prop booleana recibe un string en lugar de un boolean.

### Solución 1: Limpiar caché
```bash
# Detén el servidor (Ctrl+C)

# Limpia el caché de Expo
rm -rf node_modules/.cache
rm -rf .expo

# En Windows PowerShell:
Remove-Item -Recurse -Force node_modules\.cache, .expo -ErrorAction SilentlyContinue

# Reinicia con caché limpio
npm start -- --clear
```

### Solución 2: Reinstalar dependencias
```bash
rm -rf node_modules
npm install
npm start -- --clear
```

### Solución 3: Verificar props booleanas
Asegúrate de que todas las props booleanas usen la sintaxis correcta:

❌ **Incorrecto:**
```tsx
<TextInput secureTextEntry />
<TouchableOpacity disabled />
```

✅ **Correcto:**
```tsx
<TextInput secureTextEntry={true} />
<TouchableOpacity disabled={false} />
```

## Error: Cannot connect to API

Si estás probando en un dispositivo físico y no puedes conectarte a la API:

1. **Encuentra tu IP local:**
   ```bash
   # Windows
   ipconfig
   # Busca "IPv4 Address" (ej: 192.168.1.100)

   # Mac/Linux
   ifconfig
   # Busca "inet" (ej: 192.168.1.100)
   ```

2. **Actualiza .env:**
   ```env
   API_URL=http://192.168.1.100:3000
   ```

3. **Reinicia la app**

## Error: Push Notifications no funcionan

Las push notifications no funcionan en Expo Go desde SDK 53+.

**Solución:** Usar un development build:
```bash
npx expo run:android
# o
npx expo run:ios
```

## Error: Module not found

```bash
npm install
npm start -- --clear
```

## La app no carga

1. Verifica que el servidor de Next.js esté corriendo en `localhost:3000`
2. Verifica que `.env` tenga la configuración correcta
3. Limpia caché y reinstala:
   ```bash
   rm -rf node_modules .expo
   npm install
   npm start -- --clear
   ```
