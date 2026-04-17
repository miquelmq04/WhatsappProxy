# 🚀 Guía de Deploy - WhatsApp Proxy

## 📋 Variables de Entorno

Todas las configuraciones están en el archivo `.env`. Copia `.env.example` y ajusta los valores para tu entorno.

### Variables Requeridas

```bash
# Puerto del servidor
PORT=3001

# Host (usa 0.0.0.0 en producción para aceptar conexiones externas)
HOST=0.0.0.0

# Entorno
NODE_ENV=production

# CORS - Dominios permitidos (separados por comas)
CORS_ORIGINS=https://tu-app-nextjs.com,https://www.tu-app-nextjs.com

# Webhook donde se envían los mensajes recibidos de WhatsApp
NEXTJS_WEBHOOK_URL=https://tu-app-nextjs.com/api/whatsapp/webhook

# Secreto de autenticación (¡CAMBIA ESTO! Usa un valor seguro y largo)
WHATSAPP_SECRET=genera-un-secreto-super-largo-y-seguro-aqui

# Carpeta de autenticación de WhatsApp
AUTH_FOLDER=auth_info

# Nivel de logs (silent, error, warn, info, debug)
LOG_LEVEL=error
```

## 📦 Instalación

1. Instala las dependencias:
```bash
pnpm install
# o
npm install
```

2. Copia y configura las variables de entorno:
```bash
cp .env.example .env
# Edita el archivo .env con tus valores
```

3. Inicia el servidor:
```bash
node api.js
```

## 🔐 Importante: Sesión de WhatsApp

### Primera vez
- La carpeta `auth_info/` NO está en el repositorio (está en `.gitignore`)
- Al iniciar por primera vez, escanea el QR con WhatsApp Business
- La sesión se guardará en `auth_info/`

### Deploy a producción
Tienes dos opciones:

**Opción A: Escanear QR en producción**
1. Inicia el servidor
2. Consulta los logs para ver el QR
3. Escanea con WhatsApp Business

**Opción B: Copiar sesión existente**
1. Si ya tienes una sesión en desarrollo, copia la carpeta `auth_info/` al servidor
2. **IMPORTANTE**: Hazlo de forma segura (SFTP, SCP, nunca por git)

## 🛡️ Seguridad

### ⚠️ NUNCA subas a git:
- `.env` - Contiene secretos
- `auth_info/` - Contiene tu sesión de WhatsApp

### ✅ En producción:
1. Cambia `WHATSAPP_SECRET` a un valor largo y aleatorio
2. Usa `HOST=0.0.0.0` para aceptar conexiones externas
3. Configura `CORS_ORIGINS` con tus dominios reales
4. Usa `LOG_LEVEL=error` o `silent` para evitar logs excesivos
5. Asegúrate de que `NEXTJS_WEBHOOK_URL` apunte a tu app de Next.js en producción

## 🏗️ Plataformas de Deploy

### Railway / Render / Fly.io
1. Crea un nuevo servicio
2. Conecta tu repositorio
3. Configura las variables de entorno en el dashboard
4. Deploy automático ✨

### VPS (DigitalOcean, AWS, etc)
1. Clona el repositorio
2. Instala Node.js y pnpm
3. Configura el `.env`
4. Usa PM2 para mantener el proceso corriendo:
```bash
npm install -g pm2
pm2 start api.js --name whatsapp-proxy
pm2 save
pm2 startup
```

## 🔄 Reconexión Automática

El sistema se reconecta automáticamente si WhatsApp se desconecta temporalmente. Si la sesión es cerrada desde el móvil, necesitarás:
1. Borrar la carpeta `auth_info/`
2. Reiniciar el servidor
3. Escanear el QR nuevamente

## 📞 Soporte

Si tienes problemas:
- Revisa los logs del servidor
- Verifica que todas las variables de entorno estén configuradas
- Asegúrate de que Next.js esté corriendo y accesible desde este servidor
- Comprueba que el `WHATSAPP_SECRET` coincida en ambos lados
