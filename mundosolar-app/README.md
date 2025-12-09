# MundoSolar Mobile App 🌞

Aplicación móvil profesional para el sistema de gestión solar MundoSolar, desarrollada con React Native y Expo.

## 🎯 Características

### Por Rol de Usuario:

#### 👤 **Clientes**
- Dashboard con estadísticas de sistemas solares
- Visualización de producción de energía
- Gestión de mantenimientos programados
- Pagos y facturas
- Notificaciones push de mantenimientos y pagos

#### 🔧 **Técnicos**
- Dashboard con tareas asignadas
- Agenda de mantenimientos
- Actualización de estado de tareas en tiempo real
- Notificaciones de nuevas asignaciones

#### 👨‍💼 **Administradores y Managers**
- Dashboard completo con métricas
- Gestión de clientes y sistemas
- Reportes de rendimiento
- Control total del sistema

### ✨ Características Generales:
- 🔐 Autenticación segura con roles
- 📱 Push notifications (Expo)
- ✨ Animaciones fluidas con Reanimated
- 🎨 UI profesional y moderna
- 🌐 Integración con API de Next.js
- 📊 Dashboards interactivos
- 🔄 Pull-to-refresh en todas las pantallas

## 🚀 Instalación

### Prerrequisitos:
- Node.js 18+
- npm o yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app en tu teléfono (iOS/Android)

### Pasos:

1. **Instalar dependencias:**
   ```bash
   cd mundosolar-app
   npm install
   ```

2. **Configurar variables de entorno:**
   Crea un archivo `.env` basado en `.env.example`:
   ```bash
   cp .env.example .env
   ```

   Edita `.env` y configura:
   ```env
   API_URL=http://localhost:3000  # o tu URL de producción
   EXPO_PROJECT_ID=your-expo-project-id
   ```

3. **Iniciar el servidor de desarrollo:**
   ```bash
   npm start
   ```

4. **Ejecutar en dispositivo:**
   - Escanea el código QR con Expo Go (Android) o la cámara (iOS)
   - O presiona `a` para Android emulator
   - O presiona `i` para iOS simulator (solo en Mac)

## 📱 Estructura del Proyecto

```
mundosolar-app/
├── src/
│   ├── components/          # Componentes reutilizables
│   ├── contexts/           # Contextos de React (Auth, etc.)
│   │   └── AuthContext.tsx # Contexto de autenticación
│   ├── navigation/         # Configuración de navegación
│   │   └── AppNavigator.tsx # Navegación basada en roles
│   ├── screens/            # Pantallas de la app
│   │   ├── auth/          # Login, registro
│   │   ├── client/        # Pantallas de cliente
│   │   ├── technician/    # Pantallas de técnico
│   │   └── admin/         # Pantallas de admin
│   ├── services/          # Servicios y API
│   │   ├── api.ts        # Cliente Axios con interceptors
│   │   └── notifications.ts # Servicio de notificaciones
│   ├── constants/         # Constantes (colores, etc.)
│   │   └── colors.ts     # Paleta de colores
│   ├── types/            # TypeScript types
│   │   └── index.ts      # Tipos compartidos
│   └── utils/            # Utilidades
├── assets/               # Imágenes, fuentes, etc.
├── App.tsx              # Punto de entrada
├── app.json             # Configuración de Expo
├── babel.config.js      # Configuración de Babel
├── package.json
└── tsconfig.json
```

## 🎨 Diseño y Estética

### Colores:
- **Primary:** #3b82f6 (Azul)
- **Secondary:** #10b981 (Verde)
- **Accent:** #fbbf24 (Amarillo/Oro)
- **Success:** #10b981
- **Warning:** #f59e0b
- **Error:** #ef4444

### Animaciones:
- Entrada de componentes con FadeIn
- Transiciones suaves entre pantallas
- Logo animado con rotación y pulsación
- Pull-to-refresh en todas las listas

## 🔐 Autenticación

La app usa autenticación basada en tokens JWT:

1. El usuario inicia sesión con email y contraseña
2. El backend devuelve un JWT token
3. El token se guarda en SecureStore (encriptado)
4. Todas las peticiones incluyen el token en headers
5. La navegación cambia según el rol del usuario

### Roles:
- `CLIENT` → ClientTabs (5 pantallas)
- `TECHNICIAN` → TechnicianTabs (4 pantallas)
- `ADMIN`/`MANAGER` → AdminTabs (6 pantallas)

## 📡 API Integration

La app se conecta al backend de Next.js:

```typescript
// Ejemplo de uso:
import { systemsAPI } from '../services/api';

const systems = await systemsAPI.getAll();
const production = await systemsAPI.getProduction(systemId, startDate, endDate);
```

### Endpoints Disponibles:
- **Auth:** `/api/auth/login`, `/api/auth/me`
- **Systems:** `/api/solar-systems`, `/api/solar-systems/:id`
- **Maintenance:** `/api/maintenance`, `/api/maintenance/:id/status`
- **Payments:** `/api/payments`, `/api/payments/:id`
- **Invoices:** `/api/invoices`, `/api/invoices/:id/pdf`
- **Notifications:** `/api/notifications`, `/api/notifications/:id/read`
- **Push:** `/api/push/subscribe`, `/api/push/unsubscribe`

## 🔔 Push Notifications

### Configuración:

1. **Crear proyecto en Expo:**
   ```bash
   expo login
   eas init
   ```

2. **Obtener Project ID:**
   - Ve a https://expo.dev
   - Copia el Project ID
   - Agrégalo a `.env` como `EXPO_PROJECT_ID`

3. **Configurar en el backend:**
   - El backend necesita el Expo Push Token del dispositivo
   - La app lo envía automáticamente al iniciar sesión

### Tipos de Notificaciones:
- **Mantenimientos:** Recordatorios 24h antes
- **Pagos:** Recordatorios 3 días antes del vencimiento
- **Alertas de Sistema:** Baja producción, fallas
- **Notificaciones Generales:** Anuncios, actualizaciones

## 🏗️ Build para Producción

### Android (APK):
```bash
eas build --platform android --profile preview
```

### iOS (solo en Mac con Xcode):
```bash
eas build --platform ios --profile preview
```

### Publicar Update OTA (Over-The-Air):
```bash
expo publish
```

## 🧪 Testing

```bash
# Run tests
npm test

# Type check
npx tsc --noEmit
```

## 📝 Credenciales de Prueba

```
Admin:
  Email: admin@mundosolar.com
  Password: admin123

Técnico:
  Email: tecnico@mundosolar.com
  Password: tecnico123

Cliente:
  Email: cliente@mundosolar.com
  Password: cliente123
```

## 🛠️ Desarrollo

### Hot Reload:
Expo soporta hot reload automático. Guarda cualquier archivo y verás los cambios instantáneamente.

### Debug:
- Shake el dispositivo para abrir el menú de desarrollo
- O presiona `m` en la terminal
- Usa React DevTools: `npm run devtools`

### Troubleshooting:

**Error: "Unable to resolve module"**
```bash
npm start -- --reset-cache
```

**Push notifications no funcionan:**
- Verifica que estés usando un dispositivo físico
- Confirma que el Project ID está correcto
- Revisa permisos de notificaciones

**App no conecta al API:**
- En Android emulator, usa `http://10.0.2.2:3000` en vez de `localhost:3000`
- En iOS simulator, usa `http://localhost:3000`
- En dispositivo físico, usa la IP de tu computadora (ej: `http://192.168.1.100:3000`)

## 📦 Dependencias Principales

- **expo:** ~52.x
- **react-native:** ~0.76.x
- **@react-navigation:** ^7.x (Navegación)
- **expo-notifications:** Push notifications
- **expo-secure-store:** Almacenamiento seguro
- **react-native-reanimated:** Animaciones
- **axios:** HTTP client
- **date-fns:** Manejo de fechas

## 🚀 Próximos Pasos

- [ ] Implementar pantallas completas de Sistemas
- [ ] Añadir gráficas de producción
- [ ] Implementar chat de soporte
- [ ] Agregar modo offline con caché
- [ ] Implementar biometría (Face ID / Touch ID)
- [ ] Agregar tests unitarios y E2E

## 📄 Licencia

© 2024 MundoSolar - Todos los derechos reservados

## 👥 Soporte

Para soporte técnico, contacta a: soporte@mundosolar.com
