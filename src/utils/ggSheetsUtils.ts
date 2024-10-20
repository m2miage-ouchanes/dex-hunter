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
