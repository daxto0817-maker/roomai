const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const fs = require('fs');

const app = express();
const upload = multer({ dest: '/tmp/' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['*'] }));
app.use(express.json());
app.options('*', cors());

const stylePrompts = {
  nordic: 'Scandinavian Nordic style: light wood furniture, white sofa, warm lighting, potted plants, minimal decor',
  modern: 'Modern style: dark grey furniture, glass elements, geometric shapes, ambient lighting',
  japanese: 'Japanese wabi-sabi style: low wooden furniture, neutral earth tones, zen minimalism',
  cafe: 'Industrial cafe style: iron furniture, Edison bulb lighting, wooden accents',
  luxury: 'Luxury style: velvet furniture, gold accents, crystal lighting, opulent',
  minimal: 'Ultra minimal style: white and grey furniture, clean simple lines'
};

app.post('/generate', upload.single('image'), async (req, res) => {
  try {
    const style = req.body.style || 'nordic';
    const imagePath = req.file.path;

    const prompt = `Japanese apartment room, same room structure and layout as original photo. Keep ALL walls, floors, ceiling, windows, doors, AC unit, kitchen island EXACTLY as they are. Keep exact same camera angle and perspective. Add ${stylePrompts[style]} furniture only: small sofa, coffee table, rug, indoor plant, floor lamp. Real estate staging photo style, wide angle shot, photorealistic, cozy and warm atmosphere.`;

    const imageResponse = await openai.images.edit({
      model: 'gpt-image-2',
      image: fs.createReadStream(imagePath),
      prompt: prompt,
      size: '1024x1024',
      n: 1
    });

    fs.unlinkSync(imagePath);
    const imageData = imageResponse.data[0].b64_json;
    res.json({ success: true, image: imageData });

  } catch (err) {
    console.error(err);
    if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch(e) {}
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
const PORT = process.env.PORT || 3456;
app.listen(PORT, () => console.log(`RoomAI server running on port ${PORT}`));
