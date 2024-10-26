import { google } from 'googleapis';
import { JWT } from 'google-auth-library'; // Importez JWT

export async function getGoogleSheetsClient(): Promise<JWT> { // Déclarez le type de retour comme JWT
    const auth = new google.auth.GoogleAuth({
        keyFile: '/etc/secrets/credentials.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    // Obtenez le client et le type explicitement comme JWT
    const client = await auth.getClient();
    
    // Assurez-vous que le client est bien de type JWT
    if (!(client instanceof JWT)) {
        throw new Error('Le client obtenu n\'est pas un JWT.');
    }

    return client; // Retournez le client JWT
}
