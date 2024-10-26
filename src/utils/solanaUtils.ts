import { Connection, clusterApiUrl } from '@solana/web3.js';

export async function getTransactionDetails(txKey: string) {
    const connection = new Connection(clusterApiUrl('mainnet-beta'));

    try {
        const txDetails = await connection.getTransaction(txKey, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
        });

        const tokenBalances = txDetails?.meta?.postTokenBalances || [];

        if (tokenBalances.length > 0) {
            const adressToken = tokenBalances[tokenBalances.length - 1].mint;
            console.log(`Adresse du token :`, adressToken);
            return adressToken;
        } else {
            console.log("Aucun token échangé dans cette transaction.");
            throw new Error('Pas de token échangé');
        }

    } catch (err) {
        console.error('Erreur lors de la récupération des détails de transaction :', err);
    }
}

export async function currentPriceToken(tokenAddress: string): Promise<string> {
    // Appel à l'API pour obtenir le prix actuel du token
    const url = 'https://api.geckoterminal.com/api/v2/simple/networks/solana/token_price/' + tokenAddress;
    
    const response = await fetch(url, { method: 'GET' });
    
    if (response.status === 200) {
        const data = await response.json();
        
        // Vérification si le prix du token existe dans les attributs
        const tokenPrice = data?.data?.attributes?.token_prices?.[tokenAddress];
        
        if (tokenPrice) {
            // Convertir le prix en chaîne et remplacer le "." par une ","
            const formattedPrice = tokenPrice.toString().replace(".", ",");
            console.log(`Prix actuel du token : ${formattedPrice}`);
            return formattedPrice;
        } else {
            console.log('Prix du token non trouvé.');
            return "";
        }
    } else {
        console.log(`Erreur lors de l'appel API : ${response.status}`);
        return "";
    }
}
