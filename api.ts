// api.ts
import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectToWhatsApp, enviarMensajeWhatsapp } from './server'; // Ajusta la ruta a tu archivo
import { startupCrons } from './crons';

const app = express();
app.use(express.json());

// Configurar CORS desde variables de entorno
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

// En tu archivo de la API (api.ts)
app.post('/api/send-message', async (req, res) => {
    // Verificar token de autenticación
    const authHeader = req.headers.authorization;
    const expectedSecret = process.env.WHATSAPP_SECRET;

    if (authHeader !== `Bearer ${expectedSecret}`) {
        return res.status(401).json({ error: 'Not authorized' });
    }

    const { whatsappLid, message } = req.body;

    if (!whatsappLid || !message) {
        return res.status(400).json({ error: 'Faltan datos' });
    }

    // 1. Respondemos a Vercel/Postman AL INSTANTE
    res.status(200).json({ 
        success: true, 
        status: 'procesando',
        note: 'Orden recibida, enviando a WhatsApp en segundo plano' 
    });

    // 2. Ejecutamos el envío sin hacer esperar a nadie
    setTimeout(async () => {
        try {
            console.log(`📤 Enviando a ${whatsappLid}...`);
            await enviarMensajeWhatsapp(whatsappLid, message);
            console.log(`✅ ¡Mensaje entregado a ${whatsappLid}!`);
        } catch (error: any) {
            console.error('❌ Error interno en Baileys:', error.message);
        }
    }, 1500); 
});

// Arrancamos el servidor y, acto seguido, conectamos WhatsApp
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
    console.log(`🚀 API Express escuchando en ${PORT}`);
    
    // Encendemos el motor de Baileys
    await connectToWhatsApp();
    startupCrons();
});