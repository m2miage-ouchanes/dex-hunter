import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import readline from 'readline';
import dotenv from 'dotenv';
import { updateEnvFile } from '../utils/utils';

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

    // Charger la session depuis l'environnement ou démarrer une session vide
    let stringSession = new StringSession(process.env.TELEGRAM_SESSION || ''); // Utilise la session sauvegardée ou vide

    const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 10, retryDelay: 5000 });

    // Vérifier si une session existe déjà
    if (process.env.TELEGRAM_SESSION) {
        console.log("Session existante trouvée, démarrage direct...");
        await client.start({
            phoneNumber: async () => process.env.TG_PHONE_NUMBER || '',
            password: async () => process.env.TG_PASSWORD || '',
            phoneCode: async () => '',
            onError: (err) => {
                console.error('Erreur lors du démarrage avec session existante :', err);
            },
        });
    } else {
        console.log("Aucune session existante. Authentification requise...");

        await client.start({
            phoneNumber: async () => {
                const phoneNumber = process.env.TG_PHONE_NUMBER || await askQuestion('Veuillez entrer votre numéro de téléphone : ');
                return phoneNumber;
            },
            password: async () => process.env.TG_PASSWORD || await askQuestion('Veuillez entrer votre mot de passe (si nécessaire) : '),
            phoneCode: async () => {
                const code = await askQuestion('Veuillez entrer le code de validation que vous avez reçu : ');
                return code;
            },
            onError: (err) => {
                console.error('Erreur lors de l\'authentification :', err);
            },
        });

        // Après authentification, sauvegarder la session dans le fichier .env
        console.log("Authentification réussie. Enregistrement de la session...");
        const newSession = "" + client.session.save();  // Assure-toi que ça retourne une string
        if (newSession) {
            // Mettre à jour le fichier .env avec la nouvelle session
            updateEnvFile('TELEGRAM_SESSION', newSession);
            console.log("Session Telegram enregistrée dans le fichier .env.");
        } else {
            console.error("Erreur : Impossible de sauvegarder la session.");
        }
    }

    rl.close();  // Fermer readline après l'authentification
    return client;
}
