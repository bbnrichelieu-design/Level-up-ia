const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

let genAI;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

const userUsage = new Map();

const checkRateLimit = (req, res, next) => {
  const userId = req.body.userId || req.headers['x-user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Utilisateur non authentifié' });
  }

  const today = new Date().toDateString();
  const userKey = `${userId}_${today}`;
  const usage = userUsage.get(userKey) || 0;

  if (usage >= 50) {
    return res.status(429).json({ 
      error: 'Limite quotidienne atteinte',
      message: 'Vous avez atteint la limite de 50 requêtes par jour. Réessayez demain.'
    });
  }

  userUsage.set(userKey, usage + 1);
  next();
};

const userPreferences = new Map();

app.post('/api/auth/verify', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!admin.apps.length) {
      return res.status(200).json({ 
        success: true,
        message: 'Mode développement - Firebase non configuré'
      });
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    res.json({ success: true, uid: decodedToken.uid });
  } catch (error) {
    res.status(401).json({ error: 'Token invalide' });
  }
});

app.post('/api/settings/update', (req, res) => {
  try {
    const { userId, name, email, defaultLanguage } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }

    const prefs = userPreferences.get(userId) || {};
    
    if (name) prefs.name = name;
    if (email) prefs.email = email;
    if (defaultLanguage) prefs.defaultLanguage = defaultLanguage;
    
    userPreferences.set(userId, prefs);
    
    res.json({ 
      success: true, 
      message: 'Paramètres mis à jour',
      preferences: prefs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/settings/get', (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }

    const prefs = userPreferences.get(userId) || { defaultLanguage: 'Français' };
    res.json({ success: true, preferences: prefs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/process', checkRateLimit, async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({ 
        error: 'API Gemini non configurée',
        message: 'Veuillez configurer la clé API Gemini dans les variables d\'environnement'
      });
    }

    const { mode, text, userId, format, contrainte_alim, ton } = req.body;
    
    const userPrefs = userPreferences.get(userId) || {};
    const defaultLanguage = userPrefs.defaultLanguage || 'Français';

    let prompt = '';

    switch (mode) {
      case 'resume':
        const formatText = format === '3-points' ? 
          'Présente le résumé en 3 points clés numérotés.' : 
          'Limite le résumé à 100 mots maximum.';
        prompt = `Résume le texte ci-dessous. ${formatText} Le résultat doit être en ${defaultLanguage}.\n\nTexte: ${text}`;
        break;

      case 'recette':
        prompt = `Utilise uniquement la liste d'ingrédients fournie pour générer une recette complète. La contrainte alimentaire est ${contrainte_alim}. Le résultat doit être en ${defaultLanguage}.\n\nIngrédients: ${text}`;
        break;

      case 'polissage':
        prompt = `Réécris le texte ci-dessous. Modifie le ton pour qu'il soit ${ton}, tout en conservant le message principal. Le résultat doit être en ${defaultLanguage}.\n\nTexte: ${text}`;
        break;

      case 'image':
        prompt = `Génère une description détaillée pour créer une image basée sur cette demande. Inclus les éléments visuels, le style, les couleurs, et l'ambiance. Le résultat doit être en ${defaultLanguage}.\n\nDemande: ${text}`;
        break;

      default:
        return res.status(400).json({ error: 'Mode invalide' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text();

    res.json({ 
      success: true, 
      result: generatedText,
      usage: userUsage.get(`${userId}_${new Date().toDateString()}`)
    });

  } catch (error) {
    console.error('Erreur AI:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/process-audio', checkRateLimit, upload.single('audio'), async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({ 
        error: 'API Gemini non configurée' 
      });
    }

    const { mode, userId, format, contrainte_alim, ton } = req.body;
    const audioFile = req.file;

    if (!audioFile) {
      return res.status(400).json({ error: 'Aucun fichier audio fourni' });
    }

    const userPrefs = userPreferences.get(userId) || {};
    const defaultLanguage = userPrefs.defaultLanguage || 'Français';

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const audioPart = {
      inlineData: {
        data: audioFile.buffer.toString('base64'),
        mimeType: audioFile.mimetype
      }
    };

    const transcriptionPrompt = `Transcris précisément le contenu audio en texte. Le résultat doit être en ${defaultLanguage}.`;
    
    const transcriptionResult = await model.generateContent([transcriptionPrompt, audioPart]);
    const transcribedText = transcriptionResult.response.text();

    let finalPrompt = '';
    switch (mode) {
      case 'resume':
        const formatText = format === '3-points' ? 
          'Présente le résumé en 3 points clés numérotés.' : 
          'Limite le résumé à 100 mots maximum.';
        finalPrompt = `Résume le texte ci-dessous. ${formatText} Le résultat doit être en ${defaultLanguage}.\n\nTexte: ${transcribedText}`;
        break;

      case 'recette':
        finalPrompt = `Utilise uniquement la liste d'ingrédients fournie pour générer une recette complète. La contrainte alimentaire est ${contrainte_alim}. Le résultat doit être en ${defaultLanguage}.\n\nIngrédients: ${transcribedText}`;
        break;

      case 'polissage':
        finalPrompt = `Réécris le texte ci-dessous. Modifie le ton pour qu'il soit ${ton}, tout en conservant le message principal. Le résultat doit être en ${defaultLanguage}.\n\nTexte: ${transcribedText}`;
        break;
    }

    const finalResult = await model.generateContent(finalPrompt);
    const finalText = finalResult.response.text();

    res.json({ 
      success: true, 
      transcription: transcribedText,
      result: finalText,
      usage: userUsage.get(`${userId}_${new Date().toDateString()}`)
    });

  } catch (error) {
    console.error('Erreur traitement audio:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/process-image', checkRateLimit, upload.single('image'), async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({ 
        error: 'API Gemini non configurée' 
      });
    }

    const { mode, userId, format, contrainte_alim, ton } = req.body;
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ error: 'Aucune image fournie' });
    }

    const userPrefs = userPreferences.get(userId) || {};
    const defaultLanguage = userPrefs.defaultLanguage || 'Français';

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const imagePart = {
      inlineData: {
        data: imageFile.buffer.toString('base64'),
        mimeType: imageFile.mimetype
      }
    };

    let prompt = '';
    
    if (mode === 'recette') {
      prompt = `Identifie tous les ingrédients visibles dans cette image. Ensuite, génère une recette complète utilisant ces ingrédients. La contrainte alimentaire est ${contrainte_alim}. Le résultat doit être en ${defaultLanguage}.`;
    } else {
      prompt = `Extrais et décris précisément tout le texte et le contenu de cette image. Le résultat doit être en ${defaultLanguage}.`;
    }

    const result = await model.generateContent([prompt, imagePart]);
    const extractedContent = result.response.text();

    res.json({ 
      success: true, 
      result: extractedContent,
      usage: userUsage.get(`${userId}_${new Date().toDateString()}`)
    });

  } catch (error) {
    console.error('Erreur traitement image:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/usage', (req, res) => {
  const userId = req.headers['x-user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'Utilisateur non authentifié' });
  }

  const today = new Date().toDateString();
  const userKey = `${userId}_${today}`;
  const usage = userUsage.get(userKey) || 0;

  res.json({ 
    usage, 
    limit: 50,
    remaining: 50 - usage 
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Serveur Level Up IA démarré sur le port ${PORT}`);
  console.log(`🔗 http://localhost:${PORT}`);
  
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY non configurée');
  }
});
