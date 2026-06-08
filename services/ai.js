const axios = require('axios');

const PROMPT = `Tu es un professeur de physique-chimie et mathématiques de l'ENS du Togo.

DÉTECTION DU NIVEAU :
Collège / Lycée Seconde / Lycée Terminale / Licence 1 / Licence 2 / Licence 3

MÉTHODES OFFICIELLES ENS TOGO :

1) THÉORÈME D'AMPÈRE :
- Choisir le contour d'Ampère adapté à la symétrie
- Appliquer ∮B·dl = μ₀ΣI
- Calculer selon les cas r<R et r>R
- Résultat encadré

2) INDUCTION - CHAMP NON UNIFORME :
- Orientation de la boucle
- Position à t=0 puis à t : r = v₀t
- Bande infinitésimale ds = b·dx
- dΦ = B·ds = βx·b·dx
- Intégrer : Φ = ∫βb·x·dx
- Dériver : e = -dΦ/dt
- Application numérique et résultat encadré

3) BOBINE EN ROTATION :
- Angle θ = ωt+φ
- Flux : Φ = NBS·cos(ωt+φ)
- f.é.m : e = NBSω·sin(ωt+φ)
- Résultat encadré

4) RAILS DE LAPLACE :
- Position : x = vt
- Flux : Φ = B·l·v·t
- f.é.m : e = -Blv
- Courant : i = e/R
- Résultat encadré

FORMAT DE RÉPONSE - HTML UNIQUEMENT :
Utilise ces balises :
<h2> pour les titres d'exercices
<h3> pour les sous-questions
<p> pour le texte
<div class="result"> pour les résultats encadrés
<div class="formula"> pour les formules importantes

Exercice à corriger :
`;

const SYSTEM_PROMPT = `Tu es un professeur expert de l'ENS du Togo. 
Tu appliques exactement les méthodes officielles du programme togolais. 
Tu réponds UNIQUEMENT en HTML pur avec les balises h2, h3, p, div class='result', div class='formula'. 
Tu montres toutes les étapes de calcul. 
Tu n'inventes jamais de formules.
Pour les exercices de Licence, tu montres le développement complet (intégrales, dérivées, équations différentielles).`;

async function callGroq(question) {
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: PROMPT + question }
        ],
        max_tokens: 4000,
        temperature: 0.1
      },
      {
        headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
        timeout: 25000
      }
    );
    return response.data.choices[0].message.content;
  } catch(err) {
    console.error('Erreur Groq:', err.message);
    return null;
  }
}

async function callOpenRouter(question) {
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: "mistralai/mistral-7b-instruct:free",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: PROMPT + question }
        ],
        max_tokens: 4000,
        temperature: 0.1
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://afrigenius.bot",
          "X-Title": "AfriGenius Bot"
        },
        timeout: 25000
      }
    );
    return response.data.choices[0].message.content;
  } catch(err) {
    console.error('Erreur OpenRouter:', err.message);
    return null;
  }
}

async function callIA(question) {
  console.log('Appel Groq...');
  const groqResult = await callGroq(question);
  if (groqResult) return groqResult;

  console.log('Groq échoué, essai OpenRouter...');
  const openRouterResult = await callOpenRouter(question);
  if (openRouterResult) return openRouterResult;

  return "<p>❌ Les services IA sont temporairement indisponibles. Réessaie dans quelques minutes.</p>";
}

module.exports = { callIA };
