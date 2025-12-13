import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const getAiSuggestion = async (question: string): Promise<string> => {
  if (!apiKey) {
    return "API Key is missing. Please check your configuration.";
  }

  try {
    const prompt = `
      You are an expert interview coach. 
      The user is practicing for a job interview.
      
      Question: "${question}"
      
      Please provide a concise, structured "Ideal Answer" or a set of key "Talking Points" that the user should cover in their response. 
      Keep the tone professional and encouraging. 
      Limit the response to around 150 words.
      Format neatly.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Sorry, I couldn't generate a suggestion at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to connect to AI service. Please try again later.";
  }
};