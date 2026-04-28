# Manual de Usuario - CRM Punto Diseño 🎨✨

Bienvenido a tu nueva plataforma de gestión para **Punto Diseño**. Este sistema ha sido diseñado para centralizar tus pedidos, clientes y catálogo de productos, automatizando los procesos más tediosos.

---

## 🔐 1. Acceso al Sistema (Autenticación)

Para garantizar la seguridad de los datos de tus clientes, el sistema cuenta con controles de acceso estrictos:

1. **Métodos de Ingreso:** 
   - Puedes acceder usando un **Email y Contraseña** tradicional.
   - O puedes hacer clic en **"Continuar con Google"** para un acceso más rápido y seguro.
2. **Aprobación de Cuenta:** 
   - Por motivos de seguridad, **todas las cuentas nuevas (incluso si entras con Google) requieren ser aprobadas por un Administrador** antes de poder acceder a la información.
   - Si es tu primera vez, verás una pantalla de "Cuenta Pendiente". Avisa al administrador para que te active.
3. **Autenticación de 2 Pasos (2FA):** 
   - Si tu cuenta requiere doble seguridad, el sistema te pedirá escanear un código QR con una app como *Google Authenticator* o *Authy* en tu primer inicio de sesión.

---

## 🏗️ 2. Panel de Control (Dashboard)
Al ingresar, verás un resumen visual de la salud de tu negocio:
- **Balance Total:** Lo facturado acumulado.
- **Pedidos Activos:** Cuántos trabajos están en curso.
- **Gráficos de Ventas:** Evolución mensual de tus ingresos.
- **Clientes Registrados:** Tu base de datos de contactos.

---

## 👥 3. Gestión de Clientes
Desde el menú lateral puedes acceder a **Clientes**:
- **Añadir Cliente:** Registra nombre, email y teléfono (importante para WhatsApp).
- **Ficha del Cliente:** Visualiza sus datos y el historial de pedidos que ha realizado contigo.

---

## 📦 4. Pipeline de Pedidos (El Corazón del CRM)
La sección **Pedidos** funciona como un tablero visual (estilo Kanban).

### Estados de Producción:
Puedes mover una "tarjeta" de pedido arrastrándola o cambiándola de columna:
1.  **Nuevo Pedido:** Recién ingresado (sin procesar).
2.  **Presupuestado:** Esperando aprobación del cliente.
3.  **Diseño:** Los archivos están en proceso creativo.
4.  **Producción:** El taller está manos a la obra.
5.  **Control de Calidad:** Última revisión antes de avisar al cliente.
6.  **Para Retirar:** El pedido está listo (aquí se suele enviar el WhatsApp de aviso).
7.  **Entregado / Facturado:** El flujo finalizado.

---

## 📝 5. Crear y Editar Pedidos
Al crear un pedido:
1.  **Selecciona un Cliente.**
2.  **Añade Ítems:** Elige un producto de tu catálogo.
    -   **Cálculo Automático:** Si el producto tiene fórmulas (ej: m2), el sistema calculará el precio al poner las medidas.
    -   **Precio Manual:** Para trabajos especiales (ej: Corpóreos), el sistema te pedirá que escribas el precio unitario directamente.
3.  **Seña y Pagos:** Registra cuánto ha entregado el cliente. El sistema calculará el **Saldo Pendiente** automáticamente.

---

## 📱 6. Notificaciones de WhatsApp
Dentro de un pedido, tienes botones mágicos para comunicarte:
- **Enviar Resumen:** Manda un detalle profesional de los productos, la seña y el saldo por cobrar.
- **Aviso de Retiro:** Notifica al cliente que su pedido está listo en el local.
- **Confirmación:** Siempre aparecerá una ventana para que revises el mensaje antes de que se abra el chat de WhatsApp.

---

## 📚 7. Gestión de Catálogo (Configuración Avanzada)
Aquí configuras "qué vendes" y "cómo se cobra":
- **Crear Producto:** Define el nombre y la descripción.
- **Método de Precio:** 
    -   Selecciona **Auto-Calculado** para productos estándar.
    -   Selecciona **Ingreso Manual** para servicios variables.
- **Campos de Personalización:** Puedes añadir listas desplegables (ej: Tipo de Material), campos de texto o números que aparecerán cuando crees un pedido de ese producto.

---

## ⚙️ 8. Configuración y Marca
Personaliza tu herramienta:
- **Marca:** Sube tu logo y cambia los colores del CRM.
- **Plantillas de WhatsApp:** Edita los textos automáticos usando etiquetas especiales como `{{client_name}}` o `{{order_number}}`.

---

### 💡 Tips para el día a día:
- **Usa el Buscador:** En el historial de pedidos puedes encontrar cualquier trabajo anterior en segundos.
- **Revisa los Saldos:** El tablero de Pipeline muestra visualmente si un pedido tiene saldo pendiente para que no se te pase cobrarlo al entregar.

---
© 2026 PUNTO DISEÑO - Sistema desarrollado por **PATOLINK2005**
