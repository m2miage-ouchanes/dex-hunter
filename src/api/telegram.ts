import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import readline from 'readline';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const SESSION_FILE_PATH = './session.txt'; // Chemin relatif du fichier de session

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

    let stringSession = new StringSession('');

    // Vérifie si le fichier de session existe, et charge les données si c'est le cas
    if (fs.existsSync(SESSION_FILE_PATH)) {
        const sessionData = fs.readFileSync(SESSION_FILE_PATH, 'utf8');
        if (sessionData) {
            stringSession = new StringSession(sessionData); // Utilise la session existante
            console.log('Session récupérée avec succès.');
        }
    } else {
        console.log('Aucune session existante, démarrage de l\'authentification.');
    }

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
    }).then(() => {
        const sessionData = client.session.save();
        if (typeof sessionData === 'string') {
            fs.writeFileSync(SESSION_FILE_PATH, sessionData); // Sauvegarde la session
            console.log('Session sauvegardée avec succès.');
        } else {
            console.error('Erreur : session vide, impossible de sauvegarder.');
        }
    });

    rl.close();  // Fermer readline après l'authentification

    return client;
}
