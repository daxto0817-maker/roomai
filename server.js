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
  nordic: 'Scandinavian Nordic style: light wood furniture, white sofa, warm lighting, potted plants',
  modern: 'Modern style: dark grey furniture, glass elements, geometric shapes',
  japanese: 'Japanese wabi-sabi style: low wooden furniture, neutral tones, zen minimalism',
  cafe: 'Industrial cafe style: iron furniture, Edison bulb lighting, wooden accents',
  luxury: 'Luxury style: velvet furniture, gold accents, crystal lighting',
  minimal: 'Ultra minimal style: white and grey furniture, clean lines'
};

app.post('/generate', upload.single('image'), async (req, res) => {
  try {
    const style = req.body.style || 'nordic';
    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = req.file.mimetype;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
          { type: 'text', text: `Describe this vacant room in extreme detail: exact wall colors, floor material and color, ceiling height, window positions, door positions, fixed elements like kitchen island or AC unit. Be very specific about dimensions and colors. This will be used to recreate the exact same room.` }
        ]
      }],
      max_tokens: 600
    });

    fs.unlinkSync(imagePath);
    const roomDesc = response.choices[0].message.content;

    const imageResponse = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: `Professional real estate photo of a furnished Japanese apartment. Room: ${roomDesc}. Style: ${stylePrompts[style]}. Keep exact same walls, floors, windows. Add sofa, coffee table, rug, plants. Photorealistic.`,
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
