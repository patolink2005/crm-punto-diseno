# CRM Punto Diseño

Sistema de gestión interno para Punto Diseño, optimizado para el flujo de trabajo de cartelería, ploteos y corpóreos.

## 🚀 Funcionalidades Principales

- **Pipeline de Pedidos:** Gestión visual estilo Kanban de los estados de producción.
- **Catálogo Inteligente:** Configuración de productos con reglas de precios automatizadas (Área, Nesting de Vinilo, Base).
- **Notificaciones WhatsApp:** Envío automático de resúmenes de pedido y avisos de retiro con plantillas personalizables.
- **Gestión de Clientes y Proveedores:** Directorio centralizado con historial de pedidos.
- **Multimoneda:** Manejo de presupuestos en UYU y USD con integración de tipo de cambio.

## 🛠️ Tecnologías

- **Frontend:** React + TypeScript + Vite.
- **Estado y API:** TanStack Query (React Query).
- **Estilos:** Vanilla CSS (Diseño Premium Dark Mode).
- **Backend:** Supabase (PostgreSQL + Auth).
- **Iconos:** Lucide React.

## 📖 Gestión de Catálogo (Novedad)

Ahora puedes configurar tus productos sin escribir código JSON:
1. Accede a **Gestión de Catálogo**.
2. Crea un producto y define su **Método de Precio**:
   - **Auto-Calculado:** Usa fórmulas basadas en atributos (ej: Ancho x Alto).
   - **Ingreso Manual:** Ideal para trabajos especiales como Corpóreos, donde ingresas el precio directamente al crear el pedido.
3. Añade **Campos de Personalización** (Atributos) visualmente.

## 🔧 Configuración de Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar en local
npm run dev
```

---
¡Gracias por elegir Punto Diseño!
