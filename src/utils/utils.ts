import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Fonction pour mettre à jour le fichier .env
export const updateEnvFile = (key: string, value: string): void => {
    const envPath = path.resolve(process.cwd(), '.env'); // Localisation du fichier .env
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Vérifier si la variable existe déjà dans le fichier .env
    const keyRegex = new RegExp(`^${key}=.*`, 'm');
    if (envContent.match(keyRegex)) {
        // Mettre à jour la variable existante
        envContent = envContent.replace(keyRegex, `${key}=${value}`);
    } else {
        // Ajouter la nouvelle variable à la fin du fichier
        envContent += `\n${key}=${value}`;
    }

    // Écrire dans le fichier .env
    fs.writeFileSync(envPath, envContent);
    console.log(`Variable d'environnement ${key} mise à jour dans .env`);
};


// Fonction pour vérifier si le call vient d'une whale de la whitelist
export const isWhitelistWhale = (whaleName: string): boolean => {
    const whitelist = (process.env.WHALES_WHITELIST || '').split(','); // Récupérer la liste des whales de l'environnement
    return whitelist.includes(whaleName);
};