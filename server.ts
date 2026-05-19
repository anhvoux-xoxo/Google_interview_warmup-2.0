import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.post("/api/gemini/transcribe", async (req, res) => {
    try {
      const { base64Audio, mimeType } = req.body;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            text: "You are a professional transcriptionist. Your task is to transcribe human speech EXACTLY as heard from the person speaking directly to the microphone. \n\nCRITICAL CONSTRAINTS:\n1. If there is CLEAR, direct human speech (the interviewee answering): Output only the transcription. No commentary.\n2. If there is NO CLEAR speech, background noise, clicks, whispers, static, or SIDE CONVERSATIONS: YOU MUST OUTPUT EXACTLY: [[EMPTY_AUDIO]]\n3. DO NOT hallucinate praise. If you see people talking ABOUT the speaker, treat it as silence/noise and output [[EMPTY_AUDIO]].\n4. DO NOT guess, hallucinate, or provide filler dialogue.\n5. If the audio is just background noise: OUTPUT [[EMPTY_AUDIO]]"
          },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          }
        ],
        generationConfig: {
          temperature: 0,
        }
      });
      res.json({ text: response.text });
    } catch (error) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: "Failed to transcribe" });
    }
  });

  app.post("/api/gemini/suggestion", async (req, res) => {
    try {
      const { question } = req.body;
      const prompt = `
        You are an expert interview coach. 
        The user is practicing for a job interview.
        
        Question: "${question}"
        
        Provide exactly 3 actionable Talking Points and exactly 5-6 scannable Keywords (such as prominent action verbs or technical terms relevant to the question) that the candidate should mention in their answer to ensure structure and clarity.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              talkingPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "3 concise actionable talking points or focus questions to answer."
              },
              keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "5-6 scannable vocabulary words or key action verbs to help structure the answer."
              }
            },
            required: ["talkingPoints", "keywords"]
          }
        }
      });
      let cleanText = response.text || "{}";
      const firstCurly = cleanText.indexOf('{');
      const lastCurly = cleanText.lastIndexOf('}');
      if (firstCurly !== -1 && lastCurly !== -1) {
        cleanText = cleanText.substring(firstCurly, lastCurly + 1);
      }
      res.json(JSON.parse(cleanText));
    } catch (error) {
      console.error("Suggestion error:", error);
      res.status(500).json({ error: "Failed to get suggestion" });
    }
  });

  app.post("/api/gemini/generate-questions", async (req, res) => {
    try {
      const { jobDescription } = req.body;
      const prompt = `
        Based on the following job description, generate exactly 5 interview questions.
        Categorize each question as either 'Background', 'Situational', or 'Technical'.
        
        CRITICAL: Make the questions sound conversational for interviews. 
        Return ONLY a JSON array of objects with "text" and "type" keys.
        
        Job Description: "${jobDescription}"
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                type: { type: Type.STRING }
              },
              required: ["text", "type"]
            }
          }
        }
      });
      res.json(JSON.parse(response.text || "[]"));
    } catch (error) {
      console.error("Question generation error:", error);
      res.status(500).json({ error: "Failed to generate questions" });
    }
  });

  app.post("/api/gemini/tts", async (req, res) => {
    try {
      const { text } = req.body;
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });
      const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      res.json({ data });
    } catch (error) {
      console.error("TTS error:", error);
      res.status(500).json({ error: "TTS failed" });
    }
  });

  // Vite Middleware or Static handling
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
