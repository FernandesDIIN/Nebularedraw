import { GoogleGenAI } from "@google/genai";

export const processImage = async (
  croppedBase64: string,
  style: string,
  apiKey: string,
  modelName: string
) => {
  const ai = new GoogleGenAI({ apiKey });
  
  const stylePrompts: Record<string, string> = {
    "Mangá P&B": "This is a cropped section of a black and white manga page. Clean any text, dialogue, speech bubbles, or onomatopoeia present in this image. Reconstruct the background textures (screentones, lines) seamlessly. Return ONLY the cleaned image.",
    "Webtoon Colorido": "This is a cropped section of a colored webtoon panel. Clean any text, dialogue, speech bubbles, or onomatopoeia present in this image. Reconstruct the background colors and gradients seamlessly. Return ONLY the cleaned image.",
    "Cenário Detalhado": "This is a cropped section of a detailed background. Clean any text or unwanted artifacts present in this image. Reconstruct the complex architectural or natural details perfectly. Return ONLY the cleaned image."
  };

  const prompt = stylePrompts[style] || "Clean any text or speech bubbles from this cropped image and redraw the background seamlessly.";

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              data: croppedBase64.split(",")[1],
              mimeType: "image/png"
            }
          },
          {
            text: prompt
          }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image returned from Gemini");
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
