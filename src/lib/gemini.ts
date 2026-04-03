import { GoogleGenAI } from "@google/genai";

export const processImage = async (
  originalBase64: string,
  maskBase64: string,
  style: string,
  apiKey: string
) => {
  const ai = new GoogleGenAI({ apiKey });
  
  const stylePrompts: Record<string, string> = {
    "Mangá P&B": "This is a black and white manga page. Clean the areas marked in the mask (remove text/onomatopoeia) and redraw the background textures (screentones, lines) seamlessly in black and white style.",
    "Webtoon Colorido": "This is a colored webtoon panel. Clean the areas marked in the mask and redraw the background colors and gradients seamlessly.",
    "Cenário Detalhado": "This is a detailed background. Clean the areas marked in the mask and reconstruct the complex architectural or natural details perfectly."
  };

  const prompt = stylePrompts[style] || "Clean the areas marked in the mask and redraw the background seamlessly.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: originalBase64.split(",")[1],
              mimeType: "image/png"
            }
          },
          {
            inlineData: {
              data: maskBase64.split(",")[1],
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
