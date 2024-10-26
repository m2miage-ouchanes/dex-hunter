import dotenv from 'dotenv';
import { startTelegramClient } from './api/telegram';
import { startTelegramListener } from './utils/telegramUtils';
import express, { Request, Response, Application, NextFunction } from 'express';

const app: Application = express();
const port = 3001; // Vous pouvez changer ce port si nécessaire

// Middleware pour parser le JSON
app.use(express.json());

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
};
  
app.get("/hello", asyncHandler(async (req: Request, res: Response) => {
res.send({msg: "hello world"});
}));

dotenv.config();

const chatId = parseInt(process.env.DEXCHECK_CHANNEL_ID as string);

(async () => {
    try {
        // Démarrer le client Telegram
        const client = await startTelegramClient();

        console.log('Bot connecté !');

        // Démarrer l'écoute des messages dans un chat spécifique
        startTelegramListener(client, chatId);
        
        // Démarrer le serveur
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });

    } catch (err) {
        console.error('Erreur lors de l\'authentification :', err);
    }
})();
