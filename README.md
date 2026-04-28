# CRM Punto Diseño

Sistema de gestión interno para Punto Diseño, optimizado para el flujo de trabajo de cartelería, ploteos y corpóreos.

## 🚀 Funcionalidades Principales

- **Pipeline de Pedidos:** Gestión visual estilo Kanban de los estados de producción.
- **Catálogo Inteligente:** Configuración de productos con reglas de precios automatizadas (Área, Nesting de Vinilo, Base).
- **Notificaciones WhatsApp:** Envío automático de resúmenes de pedido y avisos de retiro con plantillas personalizables.
- **Gestión de Clientes y Proveedores:** Directorio centralizado con historial de pedidos.
- **Multimoneda:** Manejo de presupuestos en UYU y USD con integración de tipo de cambio.
- **Autenticación con Google:** Acceso con cuenta de Google OAuth 2.0 además de email y contraseña.

## 🛠️ Tecnologías

- **Frontend:** React + TypeScript + Vite.
- **Estado y API:** TanStack Query (React Query) + Zustand.
- **Estilos:** Vanilla CSS (Diseño Premium Dark Mode).
- **Backend:** Supabase (PostgreSQL + Auth + OAuth).
- **Iconos:** Lucide React.

## 🔐 Autenticación

El sistema soporta dos métodos de acceso:

1. **Email y contraseña** — registro manual con aprobación de admin.
2. **Google OAuth** — inicio de sesión con cuenta de Google (también requiere aprobación de admin).

### Flujo de acceso de nuevos usuarios

Cualquier usuario nuevo (independientemente del método) queda con cuenta **pendiente de aprobación** hasta que un administrador la active desde la página **Usuarios**.

```
Usuario → Login → (Google o Email/Contraseña)
    → Cuenta creada con is_active = false
    → Pantalla "Cuenta Pendiente"
    → Admin activa la cuenta en /users
    → Usuario puede acceder al CRM
```

### Configuración de Google OAuth (solo para devs)

Para habilitar Google OAuth en un nuevo entorno:

1. **Google Cloud Console** → APIs & Services → Credentials → Crear OAuth 2.0 Client ID (Web)
2. Agregar en "Authorized redirect URIs":  
   `https://<tu-proyecto>.supabase.co/auth/v1/callback`
3. **Supabase Dashboard** → Authentication → Providers → Google → Habilitar con Client ID y Secret
4. El trigger de base de datos `on_auth_user_created` crea el perfil automáticamente.

### Autenticación de dos factores (2FA)

Los usuarios con 2FA habilitado deben configurar Google Authenticator o Authy en su primer inicio de sesión. El sistema usa TOTP (Time-based One-Time Password) a través de Supabase MFA.

## 📖 Gestión de Catálogo

Configuración de productos sin código JSON:
1. Accede a **Gestión de Catálogo**.
2. Crea un producto y define su **Método de Precio**:
   - **Auto-Calculado:** Usa fórmulas basadas en atributos (ej: Ancho x Alto).
   - **Ingreso Manual:** Para trabajos especiales como Corpóreos.
3. Añade **Campos de Personalización** (Atributos) visualmente.

## 🗄️ Base de Datos (Supabase)

- **`public.profiles`** — Perfil de usuario (rol, nombre, estado de cuenta, 2FA).
- **`public.clients`** — Directorio de clientes.
- **`public.orders`** — Pedidos con soporte multimoneda (UYU/USD).
- **`public.order_items`** — Ítems de pedido con precio calculado.
- **`public.products_config`** — Catálogo de productos con reglas de precio.
- **`public.suppliers`** — Proveedores.
- **`public.pipeline_stages`** — Etapas del Kanban.
- **`public.system_settings`** — Configuración global del sistema.
- **`public.audit_logs`** — Log de auditoría de acciones.

### Trigger de creación automática de perfil

Al registrarse cualquier usuario (email o Google), el trigger `on_auth_user_created` inserta automáticamente un registro en `public.profiles` con `is_active = false`.

## 🔧 Configuración de Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar en local
npm run dev

# Variables de entorno requeridas (.env.local)
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<clave-anon>
```

---
¡Gracias por elegir Punto Diseño!
