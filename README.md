# Panel Vivo ⚡

Una herramienta web interactiva, ligera y en tiempo real diseñada para solucionar el problema de compartir texto y archivos entre máquinas, equipos o entornos de desarrollo. 

Esta plataforma *Serverless* funciona como un portapapeles universal en la nube, combinando la privacidad de un tablero personal con la colaboración de un espacio compartido, sin requerir instalaciones complejas.

## 🚀 Características Principales

*   **Autenticación y Privacidad:** Acceso seguro mediante usuario y contraseña (gestionado por Firebase Auth).
*   **Doble Espacio de Trabajo:**
    *   👤 **Mi Tablero:** Área privada donde solo tú puedes ver y gestionar tus tarjetas.
    *   🌍 **Espacio Compartido:** Área colaborativa en tiempo real para intercambiar datos con todo tu equipo.
*   **Sincronización Inmediata:** Actualizaciones en milisegundos a través de Firestore.
*   **Transferencia de Archivos (API Externa):** Sube archivos temporales (Max 50MB) sin consumir bases de datos privadas. Incluye descargas directas de 1-clic.
*   **Arquitectura Modular y Veloz:** Separación limpia de HTML, CSS y JS, optimizada para aprovechar el caché del navegador y cargar al instante.
*   **Interfaz y Herramientas (UX/UI):**
    *   🌙 **Modo Oscuro/Claro** persistente.
    *   👻 **Drag & Drop** con espacios predictivos (Ghosting).
    *   🎨 **Etiquetas de Color**, 📌 **Anclaje de Tarjetas**, y 🔒 **Bloqueo de Edición**.
    *   `</>` **Modo Código** para formatear scripts y comandos.
    *   📋 **Copiar Todo** con un solo clic.
    *   🔗 **Conversión Automática de Enlaces** (Linkify).
*   **Movilidad (Código QR):** Genera un QR de acceso para saltar de la computadora al teléfono en segundos.
*   **Higiene de Datos (Auto-Limpieza):** Destrucción programada opcional de tarjetas inactivas por más de 24 horas.

## 🛠️ Tecnologías Utilizadas

Desarrollo 100% *Frontend* y *Serverless*, ideal para ser alojado en plataformas de sitios estáticos.

*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (DOM puro).
*   **Backend & Auth:** Google Firebase (Firestore para base de datos y Authentication para usuarios).
*   **Almacenamiento Temporal:** API de [tmpfiles.org](https://tmpfiles.org/).
*   **Generador QR:** API de [QRServer](https://goqr.me/api/).

## ⚙️ Estructura del Proyecto

```text
📁 panel-vivo/
├── 📄 index.html
├── 📁 css/
│   └── 📄 style.css
└── 📁 js/
    └── 📄 app.js
```

## 🚀 Despliegue y Configuración

El proyecto está diseñado para funcionar nativamente en **GitHub Pages**.

1.  Clona el repositorio.
2.  En el archivo `js/app.js`, localiza el bloque `firebaseConfig` al inicio y reemplázalo con las credenciales de tu proyecto de Firebase.
3.  **Configura Firebase Auth:**
    *   Habilita el inicio de sesión por "Correo y Contraseña".
    *   Añade tu dominio de GitHub Pages a la lista de **Dominios Autorizados**.
    *   Crea los usuarios desde la consola (ej: `nombre@panelvivo.com`). El sistema Frontend pedirá solo el usuario (`nombre`) e inyectará el dominio.
4.  **Configura las Reglas de Firestore:**
    ```javascript
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /cards/{cardId} {
          allow read, create: if request.auth != null;
          allow update, delete: if request.auth != null && (resource.data.visibility == 'public' || resource.data.userId == request.auth.uid);
        }
      }
    }
    ```
5.  Haz el despliegue (push) a GitHub Pages. ¡Listo!
