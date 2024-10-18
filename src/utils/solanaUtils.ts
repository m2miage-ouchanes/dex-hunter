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
