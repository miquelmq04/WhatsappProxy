import cron from 'node-cron';

// 1. Creamos la variable de control (el candado)
let isProcessing = false;

export function startupCrons() {
  cron.schedule('* * * * *', async () => {
    
    // 2. Si el candado está puesto, cancelamos este turno
    if (isProcessing) {
      console.log('⏳ [CRON] El envío anterior sigue en curso, saltando este minuto...');
      return;
    }

    console.log('⏰ [CRON] Ejecutando revisión de mensajes pendientes...');
    
    isProcessing = true; 

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      await fetch(`${baseUrl}/api/cron/send-users-open-notification`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
      });
      console.log("✅ Fetch al cron ejecutado con éxito");
    } catch (error) {
      console.error('❌ [CRON] Error en el Cron interno:', error);
    } finally {
      isProcessing = false; 
    }
  });
}