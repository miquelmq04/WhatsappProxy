import { makeWASocket, useMultiFileAuthState, Browsers, fetchLatestBaileysVersion, DisconnectReason, ConnectionState } from '@whiskeysockets/baileys';
import pino from 'pino';
import { Boom } from '@hapi/boom'; 
// @ts-ignore
import qrcode from 'qrcode-terminal';

// 1. Variable global para guardar la sesión y poder usarla desde la API
let sock: any = null;

export async function connectToWhatsApp() {
    console.log('Iniciando sistema...');
    
    const authFolder = process.env.AUTH_FOLDER || 'auth_info';
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Usando versión WA v${version.join('.')}, isLatest: ${isLatest}`);

    // Asignamos la conexión a nuestra variable global
    const logLevel = process.env.LOG_LEVEL || 'silent';
sock = makeWASocket({
        version, 
        auth: state,
        logger: pino({ level: logLevel }) as any, 
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'), 
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: true,
        // --- AÑADE ESTO PARA ESTABILIDAD CON LIDs ---
        syncFullHistory: false, // Evita saturar la conexión al inicio
        shouldSyncHistoryMessage: () => false, // No descargues chats viejos, solo lo nuevo
        
        // Esta función "parchea" los mensajes antes de enviarlos. 
        // Ayuda a que los metadatos del dispositivo sean correctos para el sistema LID.
        patchMessageBeforeSending: (message) => {
            const requiresPatch = !!(
                message.buttonsMessage ||
                message.templateMessage ||
                message.listMessage
            );
            if (requiresPatch) {
                return {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadataVersion: 2,
                                deviceListMetadata: {},
                            },
                            ...message,
                        },
                    },
                };
            }
            return message;
        },

        getMessage: async (key) => {
            return {
                conversation: 'hello' // Mantenemos tu fallback por si falla el store
            }
        }
    });

    sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n📱 Escanea este QR con tu WhatsApp Business:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const error = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const shouldReconnect = error !== DisconnectReason.loggedOut;
            
            console.log('🔴 Conexión cerrada. Razón:', error);
            
            if (error === 405) {
                console.log('❌ Error 405: Sesión corrupta. Borra la carpeta "auth_info" y reinicia.');
            } else if (shouldReconnect) {
                console.log('🔄 Reconectando automáticamente en 5 segundos...');
                setTimeout(connectToWhatsApp, 5000); 
            } else {
                console.log('❌ Sesión cerrada desde el móvil. Debes borrar la carpeta "auth_info" y escanear el QR de nuevo.');
            }
            
        } else if (connection === 'open') {
            console.log('🟢 ¡Conectado y listo para mandar/recibir mensajes!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages }: any) => {
        const msg = messages[0];
        
        // Protecciones básicas: Sin mensaje o si es un grupo, lo ignoramos
        if (msg.key.fromMe || !msg.message || msg.key.remoteJid?.includes('@g.us')) return;
        // EXTRAEMOS EL REMITENTE
        const lid = msg.key.remoteJid;

        // EXTRAEMOS EL TEXTO (Buscador Mejorado)
        const texto = msg.message.conversation || 
                      msg.message.extendedTextMessage?.text ||
                      msg.message.ephemeralMessage?.message?.extendedTextMessage?.text ||
                      msg.message.ephemeralMessage?.message?.conversation ||
                      '';

        // 👁️ RAYOS X (Solo se imprime si hay texto)
        if (texto) {
            console.log(`\n--- NUEVO MENSAJE ---`);
            console.log(`Remitente bruto: ${lid}`);
            console.log(`Texto extraído: ${texto}`);
            console.log(`---------------------\n`);
            
            // WEBHOOK a Next.js
           try {
                // 1. Definimos el secreto desde variables de entorno
                const whatsappSecret = process.env.WHATSAPP_SECRET || "1234";  
                const webhookUrl = process.env.NEXTJS_WEBHOOK_URL || 'http://localhost:3000/api/whatsapp/webhook';

                // 2. Ejecutamos el fetch con el header de Authorization
                const response = await fetch(webhookUrl, {
                    method: 'POST', 
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${whatsappSecret}` // <--- El token que faltaba
                    },
                    body: JSON.stringify({ 
                        whatsappLid: lid, 
                        message: texto 
                    })
                });

                if (response.ok) {
                    console.log('✅ Webhook enviado a Next.js con éxito');
                } else {
                    console.log(`⚠️ Next.js respondió con error: ${response.status}`);
                }

            } catch (error) {
                console.error('❌ Error en el Webhook (¿Next.js encendido?):', error);
            }
        }
    });
}

export async function enviarMensajeWhatsapp(lid: string, texto: string) {
    if (!sock) throw new Error('WhatsApp aún no está conectado');

    // 🧠 Lógica inteligente: Si ya tiene sufijo (@lid o @s.whatsapp), déjalo igual.
    // Si es un número limpio, ponle el @s.whatsapp.net

    await sock.sendPresenceUpdate('composing', lid);
    
    // Enviamos el texto
    const sentMsg = await sock.sendMessage(lid, { text: texto });
    return sentMsg;
}
