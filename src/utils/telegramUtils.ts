import { NewMessage, NewMessageEvent } from 'telegram/events';
import { TelegramClient } from 'telegram';
import { getTransactionDetails, currentPriceToken } from './solanaUtils';
import { checkAddressInSheet, addTokenToSheet } from './ggSheetsUtils';
import { buyToken } from '../api/solProfitWave';

/**
 * Gère les messages entrants et traite ceux qui correspondent à un swap de SOL.
 */
export async function processMessage(event: NewMessageEvent) {
    const message = event.message;

    const tokenAddress = extractTokenAddressFromMessage(message);
    const tokenName = extractTokenNameFromMessage(message);
                    
    // Vérifiez si la clé du token est récupérée
    if (tokenAddress) {
        const exists = await checkAddressInSheet(tokenAddress);
        if (!exists) {
            console.log('Adresse non trouvée dans la feuille. Achat du token en cours...');
            try {
                // Appel à l'API pour acheter le token
                await buyToken(tokenAddress, 0.01); // Acheter pour 0.01 SOL

                console.log('Achat réussi. Ajout de l\'adresse dans la feuille.');

                const tokenPrice = await currentPriceToken(tokenAddress);

                // Ajouter l'adresse et le prix du token lors de l'achat du token dans la feuille Google Sheets
                await addTokenToSheet(tokenAddress, tokenName, tokenPrice);

            } catch (error) {
                console.error('Erreur lors de l\'achat du token :', error);
            }
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
                // Extraire l'adresse du token après "CA:"
                const caMatch = caLine.match(/CA:\s*`?([a-zA-Z0-9]+)`?/); // Modifié pour capturer l'adresse sans les backticks
                const tokenAddress = caMatch ? caMatch[1] : null;
                
                if (tokenAddress) {
                    console.log(`Adresse du token trouvée : ${tokenAddress}`);
                    return tokenAddress;
                }
            }
        } else {
            console.log("Ce n'est pas un ordre d'achat.");
            return null; // Retourne null si ce n'est pas un ordre d'achat
        }
    }
    
    console.log('Aucune adresse de token trouvée dans le message.');
    return null; // Retourne null si aucune adresse n'a été trouvée
}


export function extractTokenNameFromMessage(message: any): string {
    if (message && message.text) {
        const lines: string[] = message.text.split('\n');

        // Rechercher la ligne qui contient "CA:"
        const caLine = lines.find((line: string) => line.includes('CA:'));

        if (caLine) {
            // Extraire le nom du token avant "CA:"
            const tokenNameMatch = message.text.match(/(.*?)\s+CA:/);
            if (tokenNameMatch && tokenNameMatch[1]) {
                return tokenNameMatch[1].trim(); // Retirer les espaces autour
            }
        }
    }
    
    return ''; // Retourne une chaîne vide si aucun nom n'est trouvé
}


/**
 * !!!!! Plus valide !!!!!
 * Extrait le prix d'achat du token à partir d'un message contenant des informations de transaction.
 * @param message Le message Telegram contenant potentiellement le prix d'achat
 * @returns Le prix d'achat du token sous forme de chaîne, ou une chaîne vide si non trouvé
 */
export function extractPurchasePriceFromMessage(message: any): string {
    if (message && message.text) {
        const lines: string[] = message.text.split('\n');

        // Rechercher la ligne qui commence par "💰 Received:"
        const receivedLine = lines.find((line: string) => line.startsWith('💰 Received:'));
        
        if (receivedLine) {
            // Utiliser une expression régulière pour extraire le prix qui suit "Price:"
            const priceMatch = receivedLine.match(/Price:\s*\$?([\d.,]+)/);
            if (priceMatch && priceMatch[1]) {
                const price = priceMatch[1].trim(); // Retirer les espaces autour
                return price.replace('.', ','); // Remplacer "." par ","
            }
        }
    }
    
    return ''; // Retourne une chaîne vide si aucun prix n'est trouvé
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
