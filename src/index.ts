import dotenv from 'dotenv';
import { startTelegramClient } from './api/telegram';
import { startTelegramListener } from './utils/telegramUtils';

dotenv.config();

const chatId = parseInt(process.env.DEXCHECK_CHANNEL_ID as string);

(async () => {
    try {
        // Démarrer le client Telegram
        const client = await startTelegramClient();

        console.log('Bot connecté !');

        // Démarrer l'écoute des messages dans un chat spécifique
        startTelegramListener(client, chatId);

    } catch (err) {
        console.error('Erreur lors de l\'authentification :', err);
    }
})();
