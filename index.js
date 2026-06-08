require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { callIA } = require('./services/ai');
const { generatePDF, generateTXT, generateWord } = require('./services/document');

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

// Stockage temporaire des corrections
const corrections = {};

// Route principale webhook Telegram
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  const update = req.body;

  try {
    // Gestion des boutons
    if (update.callback_query) {
      await handleCallback(update.callback_query);
      return;
    }

    if (!update.message) return;
    const chatId = update.message.chat.id;
    const text = update.message.text;
    const photo = update.message.photo;

    // Commandes
    if (text === '/start') {
      await sendMessage(chatId,
        "🌍 Bienvenue sur AfriGenius Bot!\n\n" +
        "Je suis ton assistant IA pour corriger tes exercices de physique, chimie et mathématiques.\n\n" +
        "📚 Niveaux : Collège → Lycée → Licence 1,2,3\n" +
        "🏫 Programme officiel du Togo (ENS)\n\n" +
        "✏️ Envoie ton exercice en texte ou en photo !\n\n" +
        "📖 /aide pour plus d'infos"
      );
      return;
    }

    if (text === '/aide') {
      await sendMessage(chatId,
        "📖 Comment utiliser AfriGenius Bot :\n\n" +
        "1️⃣ Envoie ton exercice en texte ou photo\n" +
        "2️⃣ Je corrige et tu choisis ton format\n" +
        "3️⃣ Reçois ta correction en PDF, Word ou Texte\n\n" +
        "📚 Niveaux : Collège, Lycée, Licence 1-2-3\n" +
        "🔬 Matières : Physique, Chimie, Maths\n" +
        "🏫 Programme officiel Togo"
      );
      return;
    }

    // Exercice en texte
    if (text && !text.startsWith('/')) {
      await sendMessage(chatId, "⏳ Correction en cours, patiente...");
      const correction = await callIA(text);
      corrections[chatId] = { question: text, correction };
      await sendFormatMenu(chatId);
      return;
    }

    // Exercice en photo
    if (photo) {
      await sendMessage(chatId, "📸 Photo reçue ! Je lis l'exercice...");
      const fileId = photo[photo.length - 1].file_id;
      const imageText = await extractTextFromImage(fileId);
      if (!imageText) {
        await sendMessage(chatId, "❌ Je n'ai pas pu lire l'image. Envoie l'exercice en texte.");
        return;
      }
      await sendMessage(chatId, "✅ Exercice lu ! ⏳ Correction en cours...");
      const correction = await callIA(imageText);
      corrections[chatId] = { question: imageText, correction };
      await sendFormatMenu(chatId);
    }

  } catch (err) {
    console.error('Erreur webhook:', err);
  }
});

// Menu de choix du format
async function sendFormatMenu(chatId) {
  const keyboard = {
    inline_keyboard: [[
      { text: "📄 PDF", callback_data: `fmt_pdf_${chatId}` },
      { text: "📝 Word", callback_data: `fmt_word_${chatId}` },
      { text: "📃 Texte", callback_data: `fmt_txt_${chatId}` }
    ]]
  };
  await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    chat_id: chatId,
    text: "✅ Correction prête !\n\nChoisis ton format de téléchargement :",
    reply_markup: keyboard
  });
}

// Gestion des boutons
async function handleCallback(query) {
  const chatId = query.message.chat.id;
  const data = query.data;
  const info = corrections[chatId];

  if (!info) {
    await sendMessage(chatId, "❌ Envoie d'abord un exercice !");
    return;
  }

  if (data === `fmt_pdf_${chatId}`) {
    await sendMessage(chatId, "⏳ Génération du PDF...");
    try {
      const pdfBuffer = await generatePDF(info.question, info.correction);
      await sendDocument(chatId, pdfBuffer, "correction_afrigenius.pdf", "application/pdf", "📄 Voici ta correction en PDF ! 🌍");
    } catch(err) {
      await sendMessage(chatId, "❌ Erreur PDF. Essaie Word ou Texte !");
    }
  } else if (data === `fmt_word_${chatId}`) {
    await sendMessage(chatId, "⏳ Génération du fichier Word...");
    try {
      const wordBuffer = await generateWord(info.question, info.correction);
      await sendDocument(chatId, wordBuffer, "correction_afrigenius.html", "text/html", "📝 Ouvre avec Word ou Google Docs ! 🌍");
    } catch(err) {
      await sendMessage(chatId, "❌ Erreur Word. Essaie Texte !");
    }
  } else if (data === `fmt_txt_${chatId}`) {
    await sendMessage(chatId, "⏳ Génération du fichier texte...");
    try {
      const txtBuffer = await generateTXT(info.question, info.correction);
      await sendDocument(chatId, txtBuffer, "correction_afrigenius.txt", "text/plain", "📃 Voici ta correction en texte ! 🌍");
    } catch(err) {
      await sendMessage(chatId, "❌ Erreur. Réessaie !");
    }
  }
}

// Extraction texte depuis image
async function extractTextFromImage(fileId) {
  try {
    const fileRes = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`
    );
    const filePath = fileRes.data.result.file_path;
    const imageUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`;
    const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const base64Image = Buffer.from(imageRes.data).toString('base64');

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
            { type: "text", text: "Retranscris exactement tout le texte de cet exercice de physique ou mathématiques. Ne résous pas." }
          ]
        }],
        max_tokens: 2000
      },
      { headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}` } }
    );
    return response.data.choices[0].message.content;
  } catch(err) {
    console.error('Erreur OCR:', err);
    return null;
  }
}

// Envoyer message
async function sendMessage(chatId, text) {
  await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    chat_id: chatId,
    text: text
  });
}

// Envoyer fichier
async function sendDocument(chatId, buffer, filename, mimeType, caption) {
  const FormData = require('form-data');
  const form = new FormData();
  form.append('chat_id', chatId.toString());
  form.append('caption', caption);
  form.append('document', buffer, { filename, contentType: mimeType });

  await axios.post(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendDocument`,
    form,
    { headers: form.getHeaders() }
  );
}

// Route de santé
app.get('/', (req, res) => {
  res.json({ status: 'AfriGenius Bot actif 🌍', version: '2.0' });
});

// Démarrage
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`AfriGenius Bot démarré sur le port ${PORT}`);
  // Configurer le webhook
  if (WEBHOOK_URL) {
    await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`,
      { url: `${WEBHOOK_URL}/webhook` }
    );
    console.log(`Webhook configuré : ${WEBHOOK_URL}/webhook`);
  }
});
