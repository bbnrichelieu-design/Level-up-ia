# Level Up IA

Application web moderne d'IA multimodale basée sur Google Gemini.

## Fonctionnalités

### 4 Modes IA Principaux

1. **📝 Résumeur Intelligent**
   - Résumé en 3 points clés
   - Résumé en 100 mots maximum

2. **🍳 Générateur de Recettes**
   - Génération de recettes à partir d'ingrédients
   - Support contraintes alimentaires (Végétarien/Omnivore)
   - Analyse d'images de frigo pour identifier les ingrédients

3. **✨ Polissage d'Écrit**
   - Réécriture avec ton Formel ou Amical
   - Conservation du message principal

4. **🖼️ Générateur d'Images**
   - Description détaillée pour génération d'images
   - Basé sur les descriptions textuelles

### Fonctionnalités Multimodales

- **🎤 Audio**: Transcription et traitement de fichiers audio
- **📷 Image**: Analyse d'images et extraction de contenu
- **📄 Documents**: Support pour l'analyse de documents

### Gestion des Utilisateurs

- **Authentification Firebase**
  - Connexion Email/Mot de passe
  - Connexion Google
- **Limite d'usage**: 50 requêtes/jour par utilisateur
- **Paramètres personnalisables**:
  - Langue de sortie par défaut
  - Informations de profil

## Stack Technique

- **Backend**: Node.js + Express
- **IA**: Google Gemini API
- **Auth**: Firebase Authentication
- **Frontend**: HTML/CSS/JavaScript (Vanilla)
- **Design**: Mode sombre, responsive

## Installation

1. Installer les dépendances:
```bash
npm install
```

2. Configurer les variables d'environnement:
```bash
GEMINI_API_KEY=votre_clé_api_gemini
```

3. Démarrer le serveur:
```bash
npm start
```

L'application sera accessible sur `http://localhost:5000`

## Obtenir une Clé API Gemini

1. Visitez https://makersuite.google.com/app/apikey
2. Connectez-vous avec votre compte Google
3. Créez une nouvelle clé API
4. Ajoutez-la dans les secrets Replit ou le fichier .env

## Structure du Projet

```
.
├── server.js           # Serveur Express + API endpoints
├── index.html          # Page principale
├── login.html          # Page d'authentification
├── settings.html       # Page de paramètres
├── app.js             # Logique frontend principale
├── style.css          # Styles (mode sombre, responsive)
└── package.json       # Dépendances
```

## Utilisation

1. **Connexion**: Créez un compte ou connectez-vous avec Google
2. **Choix du mode**: Sélectionnez l'un des 4 modes IA
3. **Entrée**: 
   - Saisissez du texte directement
   - Uploadez un fichier audio
   - Uploadez une image
4. **Résultat**: L'IA traite votre demande et affiche le résultat
5. **Paramètres**: Configurez votre langue préférée et vos informations

## Sécurité

- ✅ Clé API Gemini cachée côté backend
- ✅ Rate limiting (50 requêtes/jour)
- ✅ Authentification Firebase
- ✅ Validation des entrées utilisateur

## Niveau Gratuit Garanti

L'application implémente une limite stricte de 50 requêtes par jour par utilisateur pour rester dans le niveau gratuit de l'API Gemini.
