import { NewMessage, NewMessageEvent } from 'telegram/events';
import { TelegramClient } from 'telegram';
import { getTransactionDetails, currentPriceToken } from './solanaUtils';
import { checkAddressInSheet, addTokenToSheet, addStatToSheet, checkWalletInSheet } from './ggSheetsUtils';
import { buyToken } from '../api/solProfitWave';
import dotenv from 'dotenv';
import { isWhitelistWhale } from './utils';
import TelegramBot from 'node-telegram-bot-api';


dotenv.config();

const urls = (process.env.SOL_PROFIT_WAVE_URL || '').split(',');
const wallets = (process.env.WALLET_PUBLIC_KEY || '').split(',');

if (urls.length !== wallets.length) {
    throw new Error('Les URL et les wallets doivent avoir la même longueur.');
}

/**
 * Gère les messages entrants et traite ceux qui correspondent à un swap de SOL.
 */
export async function processMessage(event: NewMessageEvent) {
    const message = event.message;

    // Vérifie si le message est un ordre d'achat
    if (!isBuyOrder(message)) {
        console.log("Ce n'est pas un ordre d'achat.");
        return; // Fin de la fonction si ce n'est pas un ordre d'achat
    }
    console.log('C\'est un ordre d\'achat !');

    const tokenAddress = extractTokenAddressFromMessage(message);
    const tokenName = extractTokenNameFromMessage(message);
    const whaleName = extractWhaleNameFromMessage(message);

    // Vérifiez si la clé du token est récupérée
    if (tokenAddress) {
        const whitelistWhale = isWhitelistWhale(whaleName);
        var isError = false;

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const wallet = wallets[i];

            const existsWallet = await checkWalletInSheet(tokenAddress, wallet);
            const exists = await checkAddressInSheet(tokenAddress, whaleName);

            if (!exists) {
                console.log(`Adresse non trouvée dans la feuille pour cette whale : ${whaleName}.`);
                if (whitelistWhale && !existsWallet) {
                    console.log(`Whale whitelistée et adresse non trouvée dans le porte-feuille ${wallet}. Achat du token en cours...`);
                    try {
                        // Appel à l'API pour acheter le token
                        await buyToken(tokenAddress, url);
                        console.log('Achat réussi.');
                    } catch (error) {
                        console.error(`Erreur lors de l\'achat du token pour le wallet ${wallet} :`, error);
                        isError = true;
                    }
                    if (process.env.TG_BOT_TOKEN && process.env.TG_BOT_CHAT_ID) {
                        try {
                            const tokenPrice = await currentPriceToken(tokenAddress);
                            await sendBuyMessage(tokenName, tokenAddress, tokenPrice);
                        } catch (error) {
                            console.error(`Erreur lors de l'envoi du message d'achat :`, error);
                        }
                    }
                }
                try {
                    console.log('Ajout de l\'adresse dans la feuille...');
                    const tokenPrice = await currentPriceToken(tokenAddress);

                    // Ajouter le nom de la whale dans la feuille Google Sheets
                    await addStatToSheet(whaleName);

                    console.log('L\'erreur est :', isError);
                    if (whitelistWhale && !existsWallet && !isError) {
                        await addTokenToSheet(tokenAddress, tokenName, tokenPrice, wallet as string);
                    } else {
                        await addTokenToSheet(tokenAddress, tokenName, tokenPrice);
                    }
                    console.log('Adresse ajoutée avec succès !');
                } catch (error) {
                    console.error('Erreur lors de l\'ajout de l\'adresse dans la feuille :', error);
                }
            } else if (exists && whitelistWhale && !existsWallet) {
                console.log(`Whale ${whaleName} whitelistée et adresse non trouvée dans le porte-feuille ${wallet}. Achat du token en cours...`);
                try {
                    // Appel à l'API pour acheter le token
                    await buyToken(tokenAddress, url); // Acheter le token

                    console.log(`Achat réussi pour le wallet ${wallet}. Ajout de l\'adresse dans la feuille.`);

                    const tokenPrice = await currentPriceToken(tokenAddress);

                    if (process.env.TG_BOT_TOKEN && process.env.TG_BOT_CHAT_ID) {
                        sendBuyMessage(tokenName, tokenAddress, tokenPrice);
                    }
                    // Ajouter l'adresse et le prix du token lors de l'achat du token dans la feuille Google Sheets
                    await addStatToSheet(whaleName);
                    await addTokenToSheet(tokenAddress, tokenName, tokenPrice, wallet as string);
                    console.log('Adresse ajoutée avec succès !');

                } catch (error) {
                    console.error(`Erreur lors de l\'achat du token pour le wallet ${wallet} :`, error);
                }
            } else {
                console.log('Pas de transaction à effectuer.');
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
export async function startTelegramListener(client: TelegramClient, chatId: number) {
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
    const lines: string[] = message.text.split('\n');

    // Rechercher la ligne qui contient "CA:""
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

    console.log('Aucune adresse de token trouvée dans le message.');
    return null; // Retourne null si aucune adresse n'a été trouvée
}


export function extractTokenNameFromMessage(message: any): string {
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

    return ''; // Retourne une chaîne vide si aucun nom n'est trouvé
}


/**
 * !!!!! Plus valide !!!!!
 * Extrait le prix d'achat du token à partir d'un message contenant des informations de transaction.
 * @param message Le message Telegram contenant potentiellement le prix d'achat
 * @returns Le prix d'achat du token sous forme de chaîne, ou une chaîne vide si non trouvé
 */
export function extractPurchasePriceFromMessage(message: any): string {
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


/**
 * Extrait le nom de la whale à partir du message.
 * @param message Le message Telegram contenant potentiellement le nom de la whale
 * @returns Le nom de la whale si trouvé, sinon null
 */
export function extractWhaleNameFromMessage(message: any): string {
    const lines: string[] = message.text.split('\n');

    // Rechercher la ligne qui commence par "🔔 TXN ALERT :"
    const txnAlertLine = lines.find((line: string) => line.startsWith('🔔 TXN ALERT :'));

    if (txnAlertLine) {
        // Utiliser une expression régulière pour capturer le nom de la whale
        const nameMatch = txnAlertLine.match(/🔔 TXN ALERT : (.+)/);
        if (nameMatch && nameMatch[1]) {
            return nameMatch[1].trim(); // Retirer les espaces autour
        }
    }

    return ''; // Retourne une chaîne vide si aucun nom n'est trouvé
}


/**
 * Vérifie si un message correspond à un ordre d'achat de SOL.
 * @param message Le message Telegram à vérifier
 * @returns true si le message correspond à un ordre d'achat de SOL, false sinon
 */
export function isBuyOrder(message: any): boolean {
    if (message && message.text) {
        const lines: string[] = message.text.split('\n');

        // Vérifie la présence de "Swapped" avec le mot exact "SOL" pour confirmer un ordre d'achat
        const swappedLine = lines.find((line: string) =>
            line.startsWith('💸 Swapped:') && /\bSOL\b/.test(line) // Utilise \b pour correspondre au mot exact "SOL"
        );

        // Vérifie la présence de "Received" avec " USDC" pour confirmer que ce n'est pas un ordre d'achat
        const receivedLine = lines.find((line: string) =>
            line.startsWith('💰 Received:') && /\bUSDC\b/.test(line) // Utilise \b pour correspondre au mot exact "USDC"
        );

        return !!swappedLine && !receivedLine; // Retourne true si "Swapped" est trouvé et "Received" n'est pas trouvé
    } else {
        return false;
    }
}


export async function sendBuyMessage(name: string, cryptoKey: string, buyPrice: string): Promise<void> {

    const message = `🟢 **Ordre d'achat** \n` +
        `• Token : ${name}\n` +
        `• Adresse : ${cryptoKey}\n` +
        `• Prix d'achat : ${buyPrice} $`;

    if (process.env.TG_BOT_TOKEN && process.env.TG_BOT_CHAT_ID) {
        const bot = new TelegramBot(process.env.TG_BOT_TOKEN);

        try {
            await bot.sendMessage(process.env.TG_BOT_CHAT_ID, message, {
                parse_mode: 'MarkdownV2',
                disable_web_page_preview: true
            });

            console.log('Message Telegram envoyé avec succès');
        } catch (error) {
            console.error('Erreur d\'envoi du message Telegram:', (error as Error).message);
            throw error;
        }
    }
}
