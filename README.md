# MundoSolar - Sistema de Gestión Solar

Sistema completo de gestión para empresas de energía solar, desarrollado con **Next.js 14**, **TypeScript**, **Prisma**, y **shadcn/ui**.

## 🌟 Características Principales

- **🏢 Gestión de Clientes**: Perfiles completos con datos fiscales mexicanos (RFC, CFDI)
- **📦 Control de Inventario**: Seguimiento de paneles solares, inversores, y refacciones
- **📋 Gestión de Órdenes**: Creación, seguimiento y facturación de pedidos
- **🔧 Mantenimiento**: Calendario y seguimiento de mantenimientos preventivos/correctivos
- **⚡ Monitoreo Solar**: Integración con API de Growatt para datos en tiempo real
- **🧾 Facturación SAT**: Generación de facturas con cumplimiento fiscal mexicano
- **📊 Dashboard Analytics**: Métricas de negocio y generación de energía
- **👥 Control de Acceso**: Sistema de roles y permisos granulares

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 14 (App Router), React 19, TypeScript
- **UI**: shadcn/ui, Tailwind CSS, Radix UI
- **Autenticación**: NextAuth.js con JWT
- **Base de Datos**: PostgreSQL + Prisma ORM
- **Estado**: TanStack Query (React Query)
- **Formularios**: React Hook Form + Zod
- **Gráficos**: Recharts
- **Iconos**: Lucide React

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js 18+ 
- PostgreSQL 14+
- npm/yarn/pnpm

### 1. Clonación e Instalación

```bash
# Clonar el proyecto (si está en git)
git clone <repository-url>
cd mundosolar

# Instalar dependencias
npm install
```

### 2. Configuración de Base de Datos

```bash
# Crear base de datos PostgreSQL
createdb mundosolar

# Configurar variables de entorno
cp .env.local.example .env.local
```

Edita `.env.local` con tus configuraciones:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/mundosolar?schema=public"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-clave-secreta-muy-segura"

# Opcional: APIs externas
GROWATT_API_URL="https://openapi.growatt.com"
WHATSAPP_API_URL="https://graph.facebook.com/v16.0"
```

### 3. Configuración de Prisma

```bash
# Generar cliente de Prisma
npm run db:generate

# Ejecutar migraciones
npm run db:migrate

# Poblar base de datos con datos iniciales
npm run db:seed
```

### 4. Ejecutar Aplicación

```bash
# Modo desarrollo
npm run dev

# Abrir en navegador
open http://localhost:3000
```

## 🔑 Credenciales de Acceso Inicial

Después de ejecutar `npm run db:seed`, puedes acceder con:

- **Email**: `admin@mundosolar.com`
- **Contraseña**: `admin123`
- **Rol**: Administrador

## 📂 Estructura del Proyecto

```
src/
├── app/                    # App Router (Next.js 14)
│   ├── (dashboard)/       # Grupo de rutas autenticadas
│   │   ├── dashboard/     # Dashboard principal
│   │   ├── clients/       # Gestión de clientes
│   │   ├── inventory/     # Control de inventario
│   │   ├── orders/        # Gestión de órdenes
│   │   ├── maintenance/   # Mantenimientos
│   │   └── reports/       # Reportes y análisis
│   ├── api/              # API Routes
│   │   ├── auth/         # Autenticación
│   │   ├── clients/      # API de clientes
│   │   └── ...
│   └── auth/             # Páginas de autenticación
├── components/            # Componentes React
│   ├── ui/               # shadcn/ui components
│   ├── layout/           # Layout components
│   └── forms/            # Componentes de formularios
├── lib/                  # Utilidades y configuración
│   ├── auth.ts           # Configuración NextAuth.js
│   ├── db.ts             # Cliente Prisma
│   ├── growatt.ts        # Integración Growatt API
│   └── utils.ts          # Funciones utilitarias
├── types/                # Definiciones TypeScript
└── hooks/                # Custom React hooks
```

## 🎯 Funcionalidades por Módulo

### 👥 Gestión de Clientes
- CRUD completo de clientes
- Datos fiscales mexicanos (RFC, Régimen Fiscal, Uso CFDI)
- Historial de órdenes y mantenimientos
- Carga de imágenes de perfil

### 📦 Inventario
- Categorías: Paneles, Inversores, Calentadores, Refacciones
- Control por ubicación/almacén
- Números de serie y facturas
- Movimientos de inventario (entrada/salida)
- Alertas de stock bajo

### 📋 Órdenes y Ventas
- Creación de cotizaciones y órdenes
- Seguimiento de estado (Borrador → Confirmada → En Progreso → Completada)
- Cálculo automático de IVA (16%)
- Integración con inventario

### 🔧 Mantenimiento
- Programación de mantenimientos preventivos
- Registro de trabajo realizado
- Repuestos utilizados
- Costos y tiempo de servicio
- Calendario visual

### ⚡ Sistemas Solares
- Registro de sistemas instalados
- Componentes por sistema
- Integración con Growatt para datos en tiempo real
- Métricas de generación y CO₂ ahorrado

### 🧾 Facturación SAT
- Generación de facturas con cumplimiento SAT
- Validación de RFC
- Uso CFDI por régimen fiscal
- Exportación XML/PDF

## 🔧 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Servidor desarrollo con Turbopack

# Base de datos
npm run db:migrate       # Ejecutar migraciones
npm run db:generate      # Generar cliente Prisma
npm run db:seed          # Poblar con datos iniciales
npm run db:studio        # Abrir Prisma Studio
npm run db:reset         # Resetear base de datos

# Producción
npm run build            # Construir aplicación
npm run start            # Servidor producción
npm run lint             # Verificar código
```

## 🌐 APIs Externas

### Growatt API
Para monitoreo solar en tiempo real:
1. Registro en [Growatt Developer](https://openapi.growatt.com)
2. Configurar credenciales en `.env.local`

### WhatsApp Business API (Opcional)
Para notificaciones automáticas:
1. Configurar Meta Business
2. Obtener token de acceso
3. Configurar webhook para respuestas

## 🔐 Seguridad

- Autenticación JWT con NextAuth.js
- Sistema de roles y permisos granulares
- Validación de formularios con Zod
- Rate limiting en APIs sensibles
- Encriptación de contraseñas con bcrypt

## 🚀 Deployment

### Vercel (Recomendado)
```bash
npm run build
vercel --prod
```

### Docker (Próximamente)
```dockerfile
# Dockerfile incluido para deployment containerizado
```

## 📚 Documentación Adicional

- [Guía de Componentes UI](docs/components.md)
- [API Reference](docs/api.md)
- [Sistema de Permisos](docs/permissions.md)
- [Integración Growatt](docs/growatt.md)
- [Facturación SAT](docs/sat.md)

## 🤝 Contribución

1. Fork del proyecto
2. Crear branch feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto es de uso privado para MundoSolar.

## 💬 Soporte

Para soporte técnico o preguntas:
- Email: soporte@mundosolar.com
- Documentación: [Wiki del proyecto](wiki/)

---

**MundoSolar v1.0** - Sistema de Gestión Solar Integral
Desarrollado con ❤️ y ☀️ para empresas de energía renovable