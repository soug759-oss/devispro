const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const Stripe = require('stripe');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_VOTRE_CLE_STRIPE';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'VOTRE_CLE_ANTHROPIC';

const stripe = new Stripe(STRIPE_SECRET_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ─── PAYMENT INTENT ───────────────────────────
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 20, // 20 centimes = 0.20€
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: { service: 'devispro' }
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GENERATE DEVIS ───────────────────────────
app.post('/api/generate-devis', async (req, res) => {
  const { vendorName, vendorJob, vendorEmail, vendorPhone, clientName, clientEmail, clientAddress, description, amount, delay, validity } = req.body;

  const prompt = `Tu es un expert en rédaction de devis professionnels français. Génère un devis complet et professionnel basé sur ces informations :

PRESTATAIRE:
- Nom/Société: ${vendorName || 'Non renseigné'}
- Métier: ${vendorJob || 'Prestataire'}
- Email: ${vendorEmail || ''}
- Téléphone: ${vendorPhone || ''}

CLIENT:
- Nom/Société: ${clientName || 'Non renseigné'}
- Email: ${clientEmail || ''}
- Adresse: ${clientAddress || ''}

PRESTATION:
- Description: ${description}
- Montant estimé: ${amount ? amount + '€' : 'À définir'}
- Délai: ${delay || 'À définir'}
- Validité du devis: ${validity || '30 jours'}

Rédige un devis structuré et professionnel avec:
1. En-tête avec les coordonnées des deux parties
2. Numéro de devis et date
3. Désignation détaillée des prestations
4. Tableau de prix (si montant fourni)
5. Conditions de paiement
6. Délai d'exécution
7. Validité du devis
8. Signature et mentions légales

Le devis doit être prêt à envoyer, formel et donner confiance au client. Ne mets aucune introduction comme "Voici le devis:", commence directement avec le contenu.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    });
    res.json({ devis: response.content[0].text.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur de génération' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ DevisPro sur http://localhost:${PORT}`));
