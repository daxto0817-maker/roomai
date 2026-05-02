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
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = req.file.mimetype;

    const analysis = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
          { type: 'text', text: `Analyze this vacant Japanese apartment room. Return ONLY these details in this exact format:
LAYOUT: [room type, approximate size]
WALLS: [exact colors and materials]
FLOOR: [exact material and color]
CEILING: [height, features like beams or lighting]
WINDOWS: [number, size, frame color, position]
FIXED: [AC unit position, kitchen details, any fixed elements]
CAMERA: [angle, height, focal length description]` }
        ]
      }],
      max_tokens: 400
    });

    fs.unlinkSync(imagePath);
    const roomDesc = analysis.choices[0].message.content;

    const prompt = `Professional real estate staging photo of a furnished Japanese apartment.
ROOM DETAILS (keep exactly as described):
${roomDesc}

FURNITURE TO ADD (${stylePrompts[style]}):
- Small sofa appropriate for room size
- Coffee table
- Rug under sofa
- Indoor plant
- Floor lamp

STRICT RULES:
- Same camera angle, height and focal length as original
- Keep ALL structural elements exactly as described
- Furniture size must match room proportions
- Photorealistic, cozy and warm atmosphere
- Wide angle shot, real estate staging style`;

    const imageResponse = await openai.images.generate({
      model: 'gpt-image-2',
      prompt: prompt,
      size: '1024x1024',
      n: 1
    });

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
