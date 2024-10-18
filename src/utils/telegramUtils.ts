import { NewMessage, NewMessageEvent } from 'telegram/events';
import { TelegramClient } from 'telegram';
import { getTransactionDetails } from './solanaUtils';
import { checkAddressInSheet } from './ggSheetsUtils';

/**
 * Gère les messages entrants et traite ceux qui correspondent à un swap de SOL.
 */
export async function processMessage(event: NewMessageEvent) {
    const message = event.message;

    const tokenAddress = extractTokenAddressFromMessage(message);
                    
    // Vérifiez si la clé du token est récupérée
    if (tokenAddress) {
        const exists = await checkAddressInSheet(tokenAddress);
        if (!exists) {
            console.log('Ajouter l\'adresse à la feuille.');
        }
    }
    console.log('Fin du traitement !');
}

/**
 * Démarre l'écoute des messages dans un chat spécifique.
 * @param client Instance du client Telegram
 * @param chatId ID du chat à filtrer
 */
export function startTelegramListener(client: TelegramClient, chatId: number) {
    client.addEventHandler(
        async (event) => {
            try {
                // Appel à la fonction de traitement du message
                await processMessage(event);
            } catch (error) {
                console.error('Erreur lors du traitement du message :', error);
            }
        },
        // Appliquer le filtre de chat ici
        new NewMessage({ chats: [chatId] })
    );
}

/**
 * Extrait l'adresse du token à partir d'un message contenant "CA:".
 * @param message Le message Telegram contenant potentiellement l'adresse du token
 * @returns L'adresse du token si elle est trouvée, sinon null
 */
export function extractTokenAddressFromMessage(message: any): string | null {
    if (message && message.text) {
        const lines: string[] = message.text.split('\n');

        // Vérification d'un swap de SOL dans le message
        const swappedLine = lines.find((line: string) => line.startsWith('💸 Swapped:') && line.includes('SOL'));
        if (swappedLine) {
            console.log('C\'est un ordre d\'achat !');
        
            // Rechercher la ligne qui commence par "JeetPT CA:" ou similaire
            const caLine = lines.find((line: string) => line.includes('CA:'));
        
            if (caLine) {
                console.log("Ligne contenant 'CA:':", caLine); // Log pour vérifier ce qu'il y a dans la ligne
                // Extraire l'adresse du token après "CA:"
                const caMatch = caLine.match(/CA:\s*`?([a-zA-Z0-9]+)`?/); // Modifié pour capturer l'adresse sans les backticks
                console.log("Résultat de l'expression régulière:", caMatch); // Log du résultat de l'expression régulière
                const tokenAddress = caMatch ? caMatch[1] : null;
                
                if (tokenAddress) {
                    console.log(`Adresse du token trouvée : ${tokenAddress}`);
                    return tokenAddress;
                }
            }
        }
    }
    
    console.log('Aucune adresse de token trouvée dans le message.');
    return null; // Retourne null si aucune adresse n'a été trouvée
}

/**
 * Extrait la clé du token à partir d'un message contenant une transaction.
 * @param message Le message Telegram contenant potentiellement une transaction
 * @param transactionUrlPattern Le pattern de l'URL de transaction spécifique au réseau (ex: Solana, Ethereum)
 * @returns La clé du token si elle est trouvée, sinon null
 */
export async function extractTokenKeyFromTxMessage(message: any, transactionUrlPattern: RegExp): Promise<string | null> {
    if (message && message.text && message.entities) {
        // Parcourir toutes les entités et vérifier si elles sont des URLs
        const txEntity = message.entities.find((entity: any) => {
            const textInMessage = message.text.slice(entity.offset, entity.offset + entity.length);
            return entity.className === 'MessageEntityTextUrl';
        });

        // Vérifier la présence de l'URL dans l'entité trouvée
        if (txEntity && 'url' in txEntity) {
            const txKeyMatch = txEntity.url.match(transactionUrlPattern);
            const txKey = txKeyMatch ? txKeyMatch[1] : null;

            if (txKey) {
                console.log(`Clé de la transaction trouvée : ${txKey}`);
                // Appel à la fonction qui récupère les détails de la transaction
                const tokenKey = await getTransactionDetails(txKey);
                return tokenKey || null; // Retourne la clé du token ou null si elle est undefined
            } else {
                console.log('Aucune clé de transaction trouvée dans l\'URL.');
            }
        } else {
            console.log('Aucune entité "TX" avec une URL trouvée.');
        }
    }
    return null; // Retourne null si aucune clé de token n'a été trouvée
}
