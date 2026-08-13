# Panel Vivo

Una herramienta web interactiva, ligera y en tiempo real diseñada para solucionar el problema de compartir texto y archivos (hasta 50MB) entre máquinas físicas o virtuales donde el portapapeles compartido no funciona o no está disponible.

Pensado para desarrolladores, administradores de sistemas y usuarios que necesitan un "puente" rápido entre diferentes entornos, sin necesidad de instalaciones complejas.

## Características Principales

*   **Sincronización en Tiempo Real:** Las tarjetas y textos se actualizan instantáneamente en todos los dispositivos conectados.
*   **Transferencia de Archivos Efímera:** Sube archivos de hasta 50MB directamente desde el navegador. Los archivos se alojan de forma temporal (expiran en ~60 minutos) mediante una API gratuita externa, evitando costos de almacenamiento.
*   **Descarga Directa:** Enlaces de un solo clic que inician la descarga inmediatamente sin abrir ventanas emergentes.
*   **Interfaz Pro/Ultra:**
    *   **Modo Oscuro (Dark Mode):** Cuidando la vista con persistencia local.
    *   **Skeleton Loader:** Carga visual fluida mientras se conecta con la base de datos.
    *   **Drag & Drop (Ghosting):** Reordena tus tarjetas magnéticamente con indicadores visuales precisos.
*   **Herramientas de Productividad (Tarjetas):**
    *   📌 **Fijar:** Ancla tarjetas importantes al principio del tablero.
    *   🎨 **Colores:** Clasifica la información con etiquetas de color pastel.
    *   `</>` **Modo Código:** Formato monoespaciado perfecto para scripts y comandos.
    *   📋 **Copiar 1-Clic:** Copia todo el contenido de la tarjeta al portapapeles al instante.
    *   🔒 **Bloqueo:** Protege tarjetas clave contra edición o borrado accidental.
    *   🔗 **Auto-Link:** Transforma automáticamente las URLs pegadas en enlaces interactivos.
*   **Acceso Móvil Instantáneo (QR):** Genera un código QR con un clic para continuar trabajando desde tu smartphone.
*   **Auto-Limpieza Inteligente:** Opción para destruir automáticamente tarjetas inactivas por más de 24 horas y mantener el entorno de trabajo limpio.

## 🛠️ Tecnologías Utilizadas

Este proyecto es 100% *Serverless* y estático, ideal para despliegues gratuitos como GitHub Pages.

*   **Frontend:** HTML5, CSS3, JavaScript puro (Vanilla JS).
*   **Base de Datos:** Firebase Cloud Firestore (Para sincronización de texto en tiempo real).
*   **Almacenamiento de Archivos:** API de [tmpfiles.org](https://tmpfiles.org/) (CORS-friendly, subida anónima, auto-destrucción).
*   **Generación de QR:** API de [QRServer](https://goqr.me/api/).

## ⚙️ Instalación y Uso

Dado que es una aplicación estática (Frontend-only), no requiere Node.js ni compilación.

1. Clona este repositorio:
   ```bash
   git clone [https://github.com/tu-usuario/panel-vivo.git](https://github.com/tu-usuario/panel-vivo.git)
