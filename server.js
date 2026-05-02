const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const fs = require('fs');

const app = express();
const upload = multer({ dest: '/tmp/' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['*']
}));
app.use(express.json());

app.options('*', cors());

const stylePrompts = {
  nordic: 'Scandinavian Nordic style: light wood furniture, white sofa, cozy warm lighting, potted plants, minimal decor',
  modern: 'Modern contemporary style: dark grey furniture, glass elements, geometric shapes, ambient lighting',
  japanese: 'Japanese wabi-sabi style: low wooden furniture, neutral earth tones, zen minimalism',
  cafe: 'Industrial cafe style: iron furniture, warm Edison bulb lighting, wooden accents',
  luxury: 'Luxury style: velvet furniture, gold accents, crystal lighting, opulent',
  minimal: 'Ultra minimal style: white and light grey furniture, clean simple lines'
};

app.post('/generate', upload.single('image'), async (req, res) => {
  try {
    const style = req.body.style || 'nordic';
    const imagePath = req.file.path;

    const prompt = `This is a vacant unfurnished Japanese apartment room. Add ${stylePrompts[style]} furniture to furnish it naturally.
STRICT RULES:
- Keep ALL walls, floors, ceiling, windows, doors EXACTLY as they are
- Keep kitchen island, AC unit in exact positions
- Only ADD furniture: sofa, coffee table, rug under sofa only
- Result must look like a real furnished apartment photo
- Same camera angle and perspective as original`;

    const response = await openai.images.edit({
      model: 'dall-e-2',
      image: fs.createReadStream(imagePath),
      prompt: prompt,
      size: '512x512',
    });

    fs.unlinkSync(imagePath);
    const imageUrl = response.data[0].url;
    res.json({ success: true, image: imageUrl });

  } catch (err) {
    console.error(err);
    if (req.file?.path) try { fs.unlinkSync(req.file.path); } catch(e) {}
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3456;
app.listen(PORT, () => console.log(`RoomAI server running on port ${PORT}`));
