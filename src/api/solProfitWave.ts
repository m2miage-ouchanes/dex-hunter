import axios, { AxiosError } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Vérifie si l'erreur est de type AxiosError
 * @param error L'erreur à vérifier
 */
function isAxiosError(error: any): error is AxiosError {
    return error.isAxiosError !== undefined;
}


/**
 * Achète un token en utilisant l'API du micro-service.
 * @param tokenPublicKey La clé publique du token à acheter.
 * @param url L'URL du micro-service d'achat.
 */
export async function buyToken(tokenPublicKey: string, url: string) {
    const urlWithEndpoint = url + "/api/transaction/buy"; // URL du micro-service d'achat

    try {
        const response = await axios.post(urlWithEndpoint, {
            tokenPublicKey
        });

        console.log('Réponse de l\'API d\'achat :', response.data);
        return response.data;
    } catch (error) {
        // Vérification si l'erreur est une AxiosError
        if (isAxiosError(error)) {
            console.error('Erreur lors de l\'appel à l\'API d\'achat :', error.response?.data || error.message);
        } else {
            console.error('Erreur inattendue :', (error as Error).message);
        }
        throw new Error('Erreur lors de l\'achat du token');
    }
}
