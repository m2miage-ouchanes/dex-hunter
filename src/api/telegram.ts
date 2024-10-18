import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import readline from 'readline';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Fonction pour lire l'entrée utilisateur
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (question: string): Promise<string> => {
    return new Promise((resolve) => {
        rl.question(question, (answer) => resolve(answer));
    });
};

// Fonction pour démarrer le client Telegram
export async function startTelegramClient(): Promise<TelegramClient> {
    const apiId = parseInt(process.env.API_ID || '');
    const apiHash = process.env.API_HASH || '';

    let stringSession = new StringSession(''); // Par défaut, session vide

    const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 10, retryDelay: 5000 });

    await client.start({
        phoneNumber: async () => process.env.TG_PHONE_NUMBER || '',
        password: async () => process.env.TG_PASSWORD || '',
        phoneCode: async () => {
            const code = await askQuestion('Veuillez entrer le code de validation que vous avez reçu : ');
            return code;
        },
        onError: (err) => {
            console.error('Erreur lors de l\'authentification :', err);
        },
    });

    rl.close();  // Ferme readline après l'authentification
    return client;
}
