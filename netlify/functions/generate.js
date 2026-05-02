const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: 'process.env.OPENAI_API_KEY' });

const stylePrompts = {
  nordic: 'Scandinavian Nordic style: light wood furniture, white sofa, cozy warm lighting, potted plants',
  modern: 'Modern contemporary style: dark grey furniture, glass elements, geometric shapes',
  japanese: 'Japanese wabi-sabi style: low wooden furniture, neutral earth tones, zen minimalism',
  cafe: 'Industrial cafe style: iron furniture, warm Edison bulb lighting, wooden accents',
  luxury: 'Luxury style: velvet furniture, gold accents, crystal lighting',
  minimal: 'Ultra minimal style: white and light grey furniture, clean lines'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, body: '' };
  }

  try {
    const body = JSON.parse(event.body);
    const style = body.style || 'nordic';
    const imageBase64 = body.image;
    const mimeType = body.mimeType || 'image/jpeg';

    const prompt = `This is a vacant unfurnished Japanese apartment room. Add ${stylePrompts[style]} furniture.
STRICT RULES:
- Keep ALL walls, floors, ceiling, windows EXACTLY as they are
- Keep kitchen island, AC unit in exact positions  
- Only ADD furniture: sofa, coffee table, rug under sofa only
- Result must look like a real furnished apartment photo`;

    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const { toFile } = require('openai');
    const imageFile = await toFile(imageBuffer, 'room.jpg', { type: mimeType });

    const response = await openai.images.edit({
      model: 'dall-e-3',
      image: imageFile,
      prompt: prompt,
      size: '1024x1024',
    });

    const imageData = response.data[0].b64_json || response.data[0].url;
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, image: imageData })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
