const express = require('express');
const cors = require('cors');
const multer = require('multer');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: '/tmp/' });
const openai = new OpenAI({ apiKey: 'process.env.OPENAI_API_KEY' });

app.use(cors());
app.use(express.json());

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
- Keep ALL walls, floors, ceiling, windows, doors EXACTLY as they are - same colors, same materials
- Keep kitchen island, AC unit, and all fixed elements in their exact positions
- Only ADD furniture: sofa, coffee table, rug (place rug ONLY under sofa in open floor area, never overlapping kitchen)
- Add plants and lighting for atmosphere
- Result must look like a real furnished apartment photo
- Same camera angle and perspective as original`;

    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = req.file.mimetype;

    const response = await openai.images.edit({
      model: 'dall-e-3',
      image: fs.createReadStream(imagePath),
      prompt: prompt,
      size: '1024x1024',
    });

    fs.unlinkSync(imagePath);

    const imageData = response.data[0].b64_json;
    res.json({ success: true, image: imageData });

  } catch (err) {
    console.error(err);
    if (req.file) fs.unlinkSync(req.file.path).catch(() => {});
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(3456, () => console.log('RoomAI server running on port 3456'));
// already handled above
