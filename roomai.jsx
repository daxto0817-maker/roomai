import { useState, useRef, useCallback } from "react";

const STYLES = [
  { id: "nordic", icon: "🪵", name: "北欧ナチュラル", desc: "木目×ホワイト\n温かみと清潔感" },
  { id: "modern", icon: "⬛", name: "モダン", desc: "黒×グレー×ガラス\n洗練されたシャープ感" },
  { id: "japanese", icon: "🎋", name: "和モダン", desc: "畳×木×障子\n日本の美意識" },
  { id: "cafe", icon: "☕", name: "カフェスタイル", desc: "レンガ×アイアン\nインダストリアル" },
  { id: "luxury", icon: "✨", name: "ラグジュアリー", desc: "大理石×ゴールド\n高級感と品格" },
  { id: "minimal", icon: "⬜", name: "ミニマル", desc: "白×グレー\nシンプルな空間" },
];

const STYLE_PROMPTS = {
  nordic: "Scandinavian Nordic style with light wood furniture, white linen sofa, warm lighting, potted fiddle leaf fig tree, minimal wool rug, and Scandinavian decor objects",
  modern: "Modern contemporary style with dark charcoal sectional sofa, glass coffee table, geometric metal floor lamp, abstract wall art, and monochrome color palette",
  japanese: "Japanese wabi-sabi style with low platform furniture, neutral linen cushions, bamboo accents, bonsai plant, shoji-inspired elements, and zen minimalism",
  cafe: "Industrial cafe style with worn leather sofa, iron-frame coffee table, Edison bulb pendant light, reclaimed wood shelving, and urban plant arrangement",
  luxury: "Luxury high-end style with velvet royal blue sofa, marble coffee table, crystal chandelier, gold accent pieces, silk curtains, and premium decorative objects",
  minimal: "Ultra-minimal style with cloud white sofa, simple oak coffee table, single architectural floor plant, neutral linen rug, and deliberately sparse arrangement",
};

export default function RoomAI() {
  const [image, setImage] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [mimeType, setMimeType] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState("nordic");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const fileRef = useRef();

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target.result);
      setImageData(e.target.result.split(",")[1]);
      setMimeType(file.type);
      setStep(2);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const generate = async () => {
    if (!imageData) return;
    setLoading(true);
    setError(null);
    setStep(3);

    try {
      const prompt = `You are a professional interior designer and photo editor. I will show you a vacant unfurnished room photo.

Your task: Describe exactly how this room would look if furnished with ${STYLE_PROMPTS[selectedStyle]}.

Write a detailed DALL-E image generation prompt that:
1. Starts with "Professional real estate interior photo of a furnished Japanese apartment"
2. Describes the EXACT same room structure (walls, floors, ceiling, windows, doors) from the photo
3. Adds specific furniture placement for ${STYLE_PROMPTS[selectedStyle]}
4. Emphasizes: same camera angle, same lighting conditions, photorealistic quality
5. Explicitly states: "DO NOT change wall colors, floor materials, window frames, or room architecture"

Output ONLY the image generation prompt, nothing else. Maximum 400 words.`;

      // Step 1: Analyze room with vision
      const analysisResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mimeType, data: imageData } },
              { type: "text", text: prompt }
            ]
          }]
        })
      });

      const analysisData = await analysisResponse.json();
      if (!analysisResponse.ok) throw new Error(analysisData.error?.message || "分析エラー");
      
      const dallePrompt = analysisData.content[0].text;

      // Step 2: Generate image with DALL-E via OpenAI
      const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer process.env.OPENAI_API_KEY`
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: dallePrompt,
          size: "1024x1024",
          quality: "hd",
          n: 1
        })
      });

      const imageResult = await imageResponse.json();
      if (!imageResponse.ok) throw new Error(imageResult.error?.message || "生成エラー");

      setResult(imageResult.data[0].url);
      setStep(4);
    } catch (err) {
      setError(err.message);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setImageData(null);
    setResult(null);
    setError(null);
    setStep(1);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0f0f0d",
      color: "#f0ede6",
      fontFamily: "'Noto Sans JP', sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&display=swap" rel="stylesheet" />
      
      {/* Header */}
      <div style={{
        padding: "20px 32px",
        borderBottom: "1px solid #2e2e2a",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(15,15,13,0.95)",
      }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 300, color: "#c8a96e", letterSpacing: "0.15em" }}>
          ROOM<span style={{ color: "#f0ede6", fontStyle: "italic" }}>AI</span>
        </div>
        <div style={{ fontSize: 11, letterSpacing: "0.2em", color: "#5a5a52", textTransform: "uppercase", border: "1px solid #2e2e2a", padding: "4px 12px", borderRadius: 2 }}>
          Interior Staging
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: "#c8a96e", textTransform: "uppercase", marginBottom: 12 }}>
            AI インテリアスタジング
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 44, fontWeight: 300, lineHeight: 1.2, marginBottom: 12 }}>
            空室を、<span style={{ fontStyle: "italic", color: "#c8a96e" }}>暮らしへ。</span>
          </div>
          <div style={{ color: "#8a8778", fontSize: 14, fontWeight: 300, lineHeight: 1.8 }}>
            空室写真をアップロードするだけで、AIが理想のインテリアを配置します。
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: "flex", marginBottom: 40, border: "1px solid #2e2e2a", borderRadius: 4, overflow: "hidden" }}>
          {["写真をアップロード", "スタイルを選択", "AI生成"].map((label, i) => {
            const s = i + 1;
            const active = step === s;
            const done = step > s;
            return (
              <div key={s} style={{
                flex: 1, padding: "14px 16px", display: "flex", alignItems: "center", gap: 10,
                background: active ? "#242420" : "#1a1a17",
                borderRight: s < 3 ? "1px solid #2e2e2a" : "none",
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, flexShrink: 0,
                  background: done ? "#c8a96e" : "transparent",
                  border: `1px solid ${active ? "#c8a96e" : done ? "#c8a96e" : "#2e2e2a"}`,
                  color: done ? "#0f0f0d" : active ? "#c8a96e" : "#5a5a52",
                }}>
                  {done ? "✓" : s}
                </div>
                <div style={{ fontSize: 12, color: active ? "#f0ede6" : "#5a5a52" }}>{label}</div>
              </div>
            );
          })}
        </div>

        {/* Upload */}
        <div style={{ background: "#1a1a17", border: "1px solid #2e2e2a", borderRadius: 4, padding: 32, marginBottom: 20 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#c8a96e", marginBottom: 20 }}>
            01 — 空室写真をアップロード
          </div>
          {!image ? (
            <div
              onClick={() => fileRef.current.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              style={{
                border: "1px dashed #2e2e2a", borderRadius: 4, padding: "48px 32px",
                textAlign: "center", cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handleFile(e.target.files[0])} />
              <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.4 }}>📷</div>
              <div style={{ color: "#8a8778", fontSize: 14, marginBottom: 6 }}>タップして写真を選択</div>
              <div style={{ color: "#5a5a52", fontSize: 12 }}>JPG, PNG, WEBP対応</div>
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <img src={image} alt="upload" style={{ width: "100%", maxHeight: 360, objectFit: "cover", borderRadius: 2 }} />
              <button onClick={reset} style={{
                position: "absolute", bottom: 12, right: 12,
                background: "rgba(15,15,13,0.85)", border: "1px solid #2e2e2a", color: "#f0ede6",
                padding: "8px 16px", fontSize: 12, cursor: "pointer", borderRadius: 2, backdropFilter: "blur(8px)",
                fontFamily: "inherit",
              }}>変更する</button>
            </div>
          )}
        </div>

        {/* Style */}
        <div style={{ background: "#1a1a17", border: "1px solid #2e2e2a", borderRadius: 4, padding: 32, marginBottom: 20 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#c8a96e", marginBottom: 20 }}>
            02 — インテリアスタイルを選択
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {STYLES.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelectedStyle(s.id)}
                style={{
                  border: `1px solid ${selectedStyle === s.id ? "#c8a96e" : "#2e2e2a"}`,
                  background: selectedStyle === s.id ? "rgba(200,169,110,0.08)" : "transparent",
                  borderRadius: 4, padding: "16px 12px", cursor: "pointer",
                  textAlign: "center", transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontSize: 12, color: "#f0ede6", marginBottom: 4 }}>{s.name}</div>
                <div style={{ fontSize: 10, color: "#5a5a52", lineHeight: 1.5, whiteSpace: "pre-line" }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Generate */}
        <button
          onClick={generate}
          disabled={!image || loading}
          style={{
            width: "100%", padding: 18,
            background: !image || loading ? "#2e2e2a" : "#c8a96e",
            color: !image || loading ? "#5a5a52" : "#0f0f0d",
            border: "none", borderRadius: 2, fontSize: 14, fontWeight: 500,
            cursor: !image || loading ? "not-allowed" : "pointer",
            fontFamily: "inherit", letterSpacing: "0.15em", transition: "all 0.2s",
            marginBottom: 16,
          }}
        >
          {loading ? "AIがインテリアを配置しています..." : "AIインテリアを生成する"}
        </button>

        {error && (
          <div style={{
            background: "rgba(217,107,90,0.1)", border: "1px solid rgba(217,107,90,0.3)",
            borderRadius: 2, padding: "12px 16px", fontSize: 13, color: "#d96b5a", marginBottom: 16,
          }}>
            エラー: {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ background: "#1a1a17", border: "1px solid #2e2e2a", borderRadius: 4, padding: 32, marginTop: 8 }}>
            <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#c8a96e", marginBottom: 20 }}>
              03 — 生成結果
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, borderRadius: 4, overflow: "hidden", marginBottom: 24 }}>
              <div style={{ position: "relative" }}>
                <img src={image} alt="Before" style={{ width: "100%", height: 280, objectFit: "cover", display: "block" }} />
                <div style={{
                  position: "absolute", top: 12, left: 12, background: "rgba(15,15,13,0.8)",
                  padding: "5px 12px", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8a8778", borderRadius: 2,
                }}>Before</div>
              </div>
              <div style={{ position: "relative" }}>
                <img src={result} alt="After" style={{ width: "100%", height: 280, objectFit: "cover", display: "block" }} />
                <div style={{
                  position: "absolute", top: 12, left: 12, background: "rgba(15,15,13,0.8)",
                  padding: "5px 12px", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#c8a96e", borderRadius: 2,
                }}>After — AI Staged</div>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <button onClick={reset} style={{
                background: "transparent", border: "1px solid #2e2e2a", color: "#8a8778",
                padding: "10px 28px", fontSize: 12, cursor: "pointer", borderRadius: 2, fontFamily: "inherit",
              }}>別の写真で試す</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
