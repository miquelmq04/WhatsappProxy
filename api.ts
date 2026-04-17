// api.ts
import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectToWhatsApp, enviarMensajeWhatsapp } from './server'; // Ajusta la ruta a tu archivo

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
    const { whatsappLid, message } = req.body;

    try {
        if (!whatsappLid || !message) {
            return res.status(400).json({ error: 'Faltan datos' });
        }

        // 1. Esperamos un poco para no saturar el socket
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 2. Intentamos enviar
        console.log(`📤 Intentando enviar a ${whatsappLid}...`);
        await enviarMensajeWhatsapp(whatsappLid, message);
        
        res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('❌ Error enviando mensaje:', error.message);
        
        // Si el error es de conexión cerrada, avisamos a Next.js con un 503 (Servicio no disponible)
        if (error.message.includes('Closed')) {
            return res.status(503).json({ error: 'WhatsApp se desconectó, reintentando...' });
        }
        
        res.status(500).json({ error: error.message });
    }
});

// Arrancamos el servidor y, acto seguido, conectamos WhatsApp
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';
app.listen(PORT, async () => {
    console.log(`🚀 API Express escuchando en http://${HOST}:${PORT}`);
    
    // Encendemos el motor de Baileys
    await connectToWhatsApp();
});