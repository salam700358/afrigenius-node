const axios = require('axios');

function buildHTML(question, correction) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset='UTF-8'/>
<style>
  body {
    font-family: Arial, sans-serif;
    padding: 40px;
    color: #1a1a1a;
    line-height: 2;
    max-width: 800px;
    margin: 0 auto;
  }
  .header {
    background: linear-gradient(135deg, #1a5276, #2874a6);
    color: white;
    padding: 25px;
    text-align: center;
    border-radius: 10px;
    margin-bottom: 30px;
  }
  .header h1 { margin: 0; font-size: 24px; }
  .header p { margin: 8px 0 0; font-size: 13px; opacity: 0.9; }
  .badge {
    display: inline-block;
    background: rgba(255,255,255,0.2);
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    margin-top: 8px;
  }
  .section-exercice {
    background: #f0f4f8;
    border-left: 5px solid #2874a6;
    padding: 20px 25px;
    margin: 20px 0;
    border-radius: 6px;
  }
  .section-exercice h2 {
    color: #1a5276;
    margin: 0 0 15px;
    font-size: 17px;
    border-bottom: 1px solid #c8d8e8;
    padding-bottom: 8px;
  }
  .section-correction {
    background: #eafaf1;
    border-left: 5px solid #27ae60;
    padding: 20px 25px;
    margin: 20px 0;
    border-radius: 6px;
  }
  .section-correction h2 {
    color: #1e8449;
    margin: 0 0 15px;
    font-size: 17px;
    border-bottom: 1px solid #a9dfbf;
    padding-bottom: 8px;
  }
  h2 { color: #1a5276; margin: 20px 0 10px; font-size: 16px; }
  h3 { color: #2874a6; margin: 15px 0 8px; font-size: 15px; }
  .formula {
    background: #e8f4f8;
    border: 1px solid #2874a6;
    border-radius: 4px;
    padding: 10px 15px;
    margin: 10px 0;
    font-style: italic;
    font-size: 15px;
    text-align: center;
  }
  .result {
    background: #d4efdf;
    border: 2px solid #1e8449;
    border-radius: 6px;
    padding: 12px 20px;
    margin: 15px 0;
    font-weight: bold;
    font-size: 16px;
    text-align: center;
    color: #1e8449;
  }
  .footer {
    text-align: center;
    color: #888;
    font-size: 11px;
    margin-top: 40px;
    border-top: 1px solid #ddd;
    padding-top: 20px;
  }
  p { margin: 8px 0; }
</style>
</head>
<body>
<div class='header'>
  <h1>🌍 AfriGenius Bot</h1>
  <p>Programme officiel Togo — ENS</p>
  <span class='badge'>Correction complète</span>
</div>
<div class='section-exercice'>
  <h2>📌 Exercice</h2>
  <p>${question.replace(/\n/g, '<br>')}</p>
</div>
<div class='section-correction'>
  <h2>✅ Correction</h2>
  ${correction}
</div>
<div class='footer'>
  <p><strong>AfriGenius Bot</strong> 🌍 — Pour les élèves africains</p>
  <p>Vérifiez toujours vos résultats avec votre professeur</p>
</div>
</body>
</html>`;
}

function stripHTML(html) {
  return html
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n=== $1 ===\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n--- $1 ---\n')
    .replace(/<div class="result"[^>]*>(.*?)<\/div>/gi, '\n[ $1 ]\n')
    .replace(/<div class="formula"[^>]*>(.*?)<\/div>/gi, '\n>> $1 <<\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

async function generatePDF(question, correction) {
  const html = buildHTML(question, correction);
  const response = await axios.post(
    'https://api.pdfshift.io/v3/convert/pdf',
    { source: html },
    {
      headers: { "X-Api-Key": process.env.PDFSHIFT_API_KEY },
      responseType: 'arraybuffer',
      timeout: 25000
    }
  );
  return Buffer.from(response.data);
}

async function generateWord(question, correction) {
  const html = buildHTML(question, correction);
  return Buffer.from(html, 'utf8');
}

async function generateTXT(question, correction) {
  const texte =
    "AFRIGENIUS BOT - CORRECTION\n" +
    "Programme officiel Togo - ENS\n" +
    "================================\n\n" +
    "EXERCICE :\n" +
    "----------\n" +
    question + "\n\n" +
    "CORRECTION :\n" +
    "------------\n" +
    stripHTML(correction) + "\n\n" +
    "================================\n" +
    "AfriGenius Bot 🌍 - Pour les élèves africains\n" +
    "Vérifiez vos résultats avec votre professeur";

  return Buffer.from(texte, 'utf8');
}

module.exports = { generatePDF, generateWord, generateTXT };
