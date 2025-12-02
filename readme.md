📘 Calendar Scheduler – Chrome Extension

Automatically generate work blocks in Google Calendar based on your task duration, working hours, and date range.
This extension lets you break long tasks into structured time blocks inside your defined schedule — perfect for productivity and time management.


## 📑 Table of Contents
- [English](#english)
- [🚀 Features](#-features)
- [🧩 Architecture](#-architecture)
- [🛠 Technologies](#-technologies)
- [📦 Installation](#-installation)
- [🔧 Configuration](#-configuration)
- [📌 How to Use](#-how-to-use)
- [🎨 UI/UX](#-uiux)
- [🔐 Security](#-security)
- [📜 License](#-license)
- [🤝 Contributing](#-contributing)
- [Spanish](#spanish)
- [📘 Calendar Scheduler – Chrome Extension](#-calendar-scheduler--chrome-extension)
- [📅 Generación automática de bloques](#-generación-automática-de-bloques)
- [🧩 Arquitectura](#-arquitectura)
- [🛠 Tecnologías utilizadas](#-tecnologías-utilizadas)
- [📦 Instalación en modo desarrollador](#-instalación-en-modo-desarrollador)
- [🔧 Configuración opcional (Advanced)](#-configuración-opcional-advanced)
- [📌 ¿Cómo usar la extensión?](#-cómo-usar-la-extensión)
- [🎨 Interfaz moderna y con tooltips](#-interfaz-moderna-y-con-tooltips)
- [🔐 Seguridad](#-seguridad)
- [📜 Licencia](#-licencia)
- [🤝 Contribuciones](#-contribuciones)

# 🇪🇸 English 
## 🚀 Features
🔐 Google Authentication

Secure OAuth 2.0 + PKCE flow.

Uses default embedded credentials OR allows users to enter their own in the Options page.

Tokens are stored locally and refreshed automatically.

## 📅 Automatic Block Generation

Configurable parameters:

Event name

Event color (Google Calendar colorId)

Task start (date + time)

Task end (date + time)

Working hours

Block duration (e.g., 30 minutes)

The extension automatically calculates and schedules all blocks within your defined timespan.

## 🧩 Architecture

Follows a modular Hexagonal / Clean Architecture structure:
```
src/
 ├── popup/            → Main UI (popup.html + popup.js + popup.css)
 ├── options/          → Advanced configuration
 ├── background/       → Persistent process (auth + messages + scheduler)
 ├── lib/
 │     ├── auth.js         → OAuth2 + PKCE + token handling
 │     ├── scheduler.js    → Logic for generating blocks
 │     └── calendarApi.js  → Google Calendar API requests
 └── storage/
       └── config.js       → User configuration storage
```

- ✔ Modular
- ✔ Maintainable
- ✔ Browser-friendly (Chrome / Edge / Brave)

## 🛠 Technologies

JavaScript ES Modules

Chrome Extensions Manifest V3

Google OAuth 2.0 (PKCE)

Google Calendar API v3

HTML5 + CSS3 custom dark UI

## 📦 Installation (Developer Mode)

Clone or download the repo:

git clone https://github.com/your-user/calendar-scheduler-extension.git


Go to Chrome → chrome://extensions/

Enable Developer Mode

Click Load unpacked

Select the project folder

Done 🎉

## 🔧 Optional Configuration (Advanced)

Inside the Options page, you can configure:

Google OAuth Client ID

Google Client Secret (local-only use)

Calendar ID (default: primary)

Block duration

Timezone (IANA format)

If fields are left empty, default credentials are used:

const DEFAULT_CLIENT_ID = "xxxx.apps.googleusercontent.com";
const DEFAULT_CLIENT_SECRET = "GOCSPX-xxxxx";

## 📌 How to Use

Open the popup

Click Connect with Google Calendar

Fill in:

Event name

Event color

Start date-time

End date-time

Working hours

Click Create blocks in the calendar

The extension schedules all blocks automatically.

## 🎨 UI/UX Design

Fully custom dark theme

Clean neumorphism + glassmorphism

Inline help tooltips for every field

Visible date/time picker icons

Compact layout optimized for Chrome popup size

## 🔐 Security

No credentials are transmitted anywhere

Tokens stored locally only

PKCE removes the need to expose client_secret for login

Client Secret is optional and used only for token refresh if configured

## 📜 License

Choose the license you prefer (MIT, Apache, etc.)

## 🤝 Contributing

PRs, UI improvements, refactoring, or general suggestions are welcome.
Open an issue or fork the project anytime.

# Spanish

## 📘 Calendar Scheduler – Chrome Extension

Automatiza la creación de bloques de trabajo en Google Calendar según tus horarios, fechas y parámetros personalizados.
Esta extensión te permite planificar tareas largas dividiéndolas automáticamente en bloques de trabajo dentro de un horario laboral configurable.

🚀 Características principales
🔐 Autenticación con Google

Conexión segura mediante OAuth 2.0 + PKCE.

Usa credenciales por defecto (quemadas en código) o permite que cada usuario ingrese sus propias credenciales desde la página de opciones.

Los tokens se almacenan localmente y se refrescan automáticamente.

## 📅 Generación automática de bloques

Puedes configurar:

- Nombre del evento

- Color del evento (Google Calendar colorId)

- Fecha + hora de inicio de la tarea

- Fecha + hora final de la tarea

- Horario laboral permitido

- Duración del bloque (ej. 30 min)

La extensión calcula automáticamente todos los bloques necesarios dentro del rango.

## 🧩 Arquitectura

Se usa estructura modular y tipo Hexagonal / Clean Architecture, separada así:
```
src/
 ├── popup/           → UI principal (popup.html + popup.js + popup.css)
 ├── options/         → Configuración avanzada (options.html + options.js + options.css)
 ├── background/      → Proceso persistente (auth, mensajes, scheduler)
 ├── lib/
 │     ├── auth.js    → Manejo OAuth2 + PKCE + tokens
 │     ├── scheduler.js → Lógica para dividir tareas en bloques
 │     └── calendarApi.js → Requests a Google Calendar
 └── storage/
       └── config.js  → Cargar/guardar configuración del usuario 
```

- ✔ UI independiente
- ✔ Lógica desacoplada
- ✔ Permite migrar de Chrome a Edge/Brave sin cambios
- ✔ Mantenible y escalable

## 🛠 Tecnologías utilizadas

- JavaScript ES Modules

- Chrome Extensions Manifest V3

- Google OAuth 2.0 (PKCE)

- Google Calendar API v3

- HTML5, CSS3 (Dark UI + tooltips personalizados)

## 📦 Instalación en modo desarrollador

Descarga o clona el repositorio:

git clone https://github.com/judricalderon/Calendar-extension.git


- Abre Chrome → chrome://extensions/

- Activa Modo desarrollador

- Clic en “Cargar descomprimida”

- Selecciona la carpeta del proyecto

Listo 🎉

## 🔧 Configuración opcional (Advanced)

En Options puedes:

- Ingresar tu propio Google OAuth Client ID

- Ingresar tu Client Secret (solo para uso local)

- Cambiar:

- Calendar ID (por defecto: primary)

- Duración del bloque

- Zona horaria

Si no ingresas nada, la extensión usa las credenciales por defecto.

## 📌 ¿Cómo usar la extensión?

### 1️⃣ Abre el popup
### 2️⃣ Presiona Conectar con Google Calendar
### 3️⃣ Llena los siguientes datos:

- Nombre del evento

- Color del evento

- Inicio de la tarea (fecha + hora)

- Fin de la tarea (fecha + hora)

- Horario laboral

### 4️⃣ Clic en Crear bloques en el calendario

La extensión generará automáticamente todos los eventos dentro de tu horario laboral entre las fechas definidas.

## 🎨 Interfaz moderna y con tooltips

Incluye:

- Inputs estilizados

- Tooltips explicativos sobre cada parámetro

- Calendarios visibles en modo oscuro

- Bloques con diseño neumórfico + glassmorphism

## 🔐 Seguridad

- No se guardan tus credenciales, solo tokens de acceso locales.

- PKCE elimina la necesidad del client_secret para iniciar sesión.

- El client_secret solo se usa para el refresh token en modo avanzado.

- No se envía ningún dato a servidores externos.

## 📜 Licencia

Este proyecto está protegido bajo la licencia MIT License.

## 🤝 Contribuciones

Pull requests, mejoras de UI/UX, sugerencias o reportes de bugs son siempre bienvenidos.
