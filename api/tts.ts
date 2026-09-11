import { GoogleGenAI, Modality } from "@google/genai";

export default async function handler(req: any, res: any) {
  // Hanya izinkan metode POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, voiceName = "Puck" } = req.body;
    
    // Inisialisasi Gemini AI
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (base64Audio) {
      res.status(200).json({ audio: base64Audio });
    } else {
      res.status(500).json({ error: "Gagal membuat suara." });
    }
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
}
