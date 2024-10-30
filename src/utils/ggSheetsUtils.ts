import { google } from 'googleapis';
import { JWT } from 'google-auth-library'; // Importez JWT
import { getGoogleSheetsClient } from '../api/ggSheets';

export async function checkAddressInSheet(address: string): Promise<boolean> {
    const sheets = google.sheets('v4');

    // Typage correct pour un client basé sur JWT
    const client: JWT = await getGoogleSheetsClient(); // Assuré que cela renvoie un JWT

    const spreadsheetId = process.env.GGSHEET_ID || ''; 
    const range = 'Degen - Paramètres et Suivi!A:L'; 

    try {
        const response = await sheets.spreadsheets.values.get({
            auth: client, // Utilisation du client JWT pour l'authentification
            spreadsheetId,
            range,
        });

        const rows = response.data?.values || []; // Vérification si data est défini

        if (rows.length) {
            const memeCoinIndex = rows[0].indexOf('Clé du meme coin');
            const stopLossIndex = rows[0].indexOf('Stop-loss');

            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (row[stopLossIndex] === 'FALSE' && row[memeCoinIndex] === address) {
                    console.log('L\'adresse existe déjà dans la feuille.');
                    return true;
                }
            }
            console.log('L\'adresse n\'existe pas dans la feuille.');
            return false;
        } else {
            console.log('Aucune donnée trouvée dans la feuille.');
            return false;
        }
    } catch (error) {
        console.error('Erreur lors de la récupération des données de la feuille :', error);
        throw new Error('Erreur lors de la récupération des données de la feuille.');
    }
}


/**
 * Ajoute un token à la feuille Google Sheets dans les colonnes "Clé du meme coin", "Nom du meme coin" et "Prix d'achat meme coin ($)".
 * @param tokenAddress L'adresse du token à ajouter
 * @param tokenName Le nom du token
 * @param purchasePrice Le prix d'achat du token
 */
export async function addTokenToSheet(tokenAddress: string, tokenName: string, purchasePrice: string) {
    const sheets = google.sheets('v4');
    const client: JWT = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GGSHEET_ID || ''; 
    const range = 'Degen - Paramètres et Suivi!A:C'; // Le même range utilisé pour la vérification

    try {
        // Récupération des lignes existantes pour déterminer où insérer la nouvelle entrée
        const response = await sheets.spreadsheets.values.get({
            auth: client,
            spreadsheetId,
            range,
        });

        const rows = response.data?.values || [];

        // Définition des index des colonnes correspondantes
        const memeCoinIndex = rows[0].indexOf('Clé du meme coin');
        const nameIndex = rows[0].indexOf('Nom du meme coin');
        const priceIndex = rows[0].indexOf('Prix d\'achat meme coin ($)');

        if (memeCoinIndex === -1 || nameIndex === -1 || priceIndex === -1) {
            throw new Error('Colonnes non trouvées dans la feuille.');
        }

       // Trouver la première ligne vide dans la colonne "Clé du meme coin"
       let firstEmptyRow = rows.length; // On commence après la dernière ligne de la feuille

       for (let i = 1; i < rows.length; i++) {
           if (!rows[i][memeCoinIndex]) { // Si la cellule est vide dans la colonne "Clé du meme coin"
               firstEmptyRow = i + 1; // Numéro de ligne à insérer (i + 1 car les lignes sont indexées à partir de 1 dans Google Sheets)
               break;
           }
       }
       firstEmptyRow += 1; // Ajout d'une ligne supplémentaire pour insérer la nouvelle entrée

       // Préparation des données à insérer uniquement pour les colonnes spécifiées
       const newRow = Array(rows[0].length).fill(''); // Crée une ligne vide de la même longueur que les autres
       newRow[memeCoinIndex] = tokenAddress; // Insertion de l'adresse du token
       newRow[nameIndex] = tokenName; // Insertion du nom du token
       newRow[priceIndex] = purchasePrice.toString(); // Insertion du prix d'achat

       // Ajout des données à la première ligne vide trouvée
       const appendRange = `Degen - Paramètres et Suivi!A${firstEmptyRow}`; // Spécifie la ligne à insérer (A)

       await sheets.spreadsheets.values.update({
           auth: client,
           spreadsheetId,
           range: appendRange,
           valueInputOption: 'RAW', // Option pour insérer les valeurs telles quelles
           requestBody: {
               values: [newRow], // Ajout de la nouvelle ligne sous forme de tableau
           },
       });

        console.log('Nouvelle adresse de token ajoutée avec succès dans Google Sheets.');
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la nouvelle adresse dans la feuille :', error);
        throw new Error('Erreur lors de l\'ajout de la nouvelle adresse dans la feuille.');
    }
}


export async function addStatToSheet(whaleName: string) {
    const sheets = google.sheets('v4');
    const client: JWT = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GGSHEET_ID || ''; 
    const range = 'Degen - Statistiques!A:E'; // Le même range utilisé pour la vérification

    try {
        // Récupération des lignes existantes pour déterminer où insérer la nouvelle entrée
        const response = await sheets.spreadsheets.values.get({
            auth: client,
            spreadsheetId,
            range,
        });

        const rows = response.data?.values || [];

        // Définition des index des colonnes correspondantes
        const memeCoinIndex = rows[0].indexOf('Nom du meme coin');
        const whaleIndex = rows[0].indexOf('Whale');
        const dateIndex = rows[0].indexOf('Date d\'achat');

        if (whaleIndex === -1 || dateIndex === -1 || memeCoinIndex === -1) {
            throw new Error('Colonnes non trouvées dans la feuille.');
        }

       // Trouver la première ligne vide dans la colonne "Clé du meme coin"
       let firstEmptyRow = rows.length; // On commence après la dernière ligne de la feuille

       for (let i = 1; i < rows.length; i++) {
           if (!rows[i][memeCoinIndex]) { // Si la cellule est vide dans la colonne "Clé du meme coin"
               firstEmptyRow = i + 1; // Numéro de ligne à insérer (i + 1 car les lignes sont indexées à partir de 1 dans Google Sheets)
               break;
           }
       }
       firstEmptyRow += 1; // Ajout d'une ligne supplémentaire pour insérer la nouvelle entrée

       // Formater la date du jour au format "dd/MM/yyyy"
       const today = new Date();
       const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

       // Préparation des données à insérer uniquement pour les colonnes spécifiées
       const newRow = [whaleName, formattedDate]; // Limité aux colonnes D et E


       // Ajout des données à la première ligne vide trouvée
       const appendRange = `Degen - Statistiques!D${firstEmptyRow}:E${firstEmptyRow}`; // Spécifie la ligne à insérer (de colonne D à E)

       await sheets.spreadsheets.values.update({
           auth: client,
           spreadsheetId,
           range: appendRange,
           valueInputOption: 'RAW', // Option pour insérer les valeurs telles quelles
           requestBody: {
               values: [newRow], // Ajout de la nouvelle ligne sous forme de tableau
           },
       });

        console.log('Informations du token ajoutés avec succès dans l\'onglet de statistiques du Google Sheets.');
    } catch (error) {
        console.error('Erreur lors de l\'ajout des stats dans la feuille :', error);
        throw new Error('Erreur lors de l\'ajout des stats dans la feuille.');
    }
}