
import { GoogleGenAI, Modality, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Global cache to store speech promises
const speechCache = new Map<string, Promise<Uint8Array | null>>();

class AudioManager {
  private ctx: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private onEndedCallback: (() => void) | null = null;
  private isCurrentlyPlaying: boolean = false;

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass({ sampleRate: 24000 });
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  isPlaying() {
    return this.isCurrentlyPlaying;
  }

  setOnEnded(cb: (() => void) | null) {
    this.onEndedCallback = cb;
  }

  async decodePCM(data: Uint8Array): Promise<AudioBuffer> {
    const ctx = this.init();
    const dataInt16 = new Int16Array(data.buffer);
    const numChannels = 1;
    const sampleRate = 24000;
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  async playSpeech(dataOrPromise: Uint8Array | Promise<Uint8Array | null>, onEnded?: () => void) {
    this.init(); // Warm up context on the click event thread
    this.stop();
    this.isCurrentlyPlaying = true;
    
    try {
      const data = dataOrPromise instanceof Promise ? await dataOrPromise : dataOrPromise;
      if (!data) {
        this.isCurrentlyPlaying = false;
        return;
      }

      const ctx = this.init();
      const buffer = await this.decodePCM(data);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        if (this.currentSource === source) {
          this.currentSource = null;
          this.isCurrentlyPlaying = false;
          onEnded?.();
          this.onEndedCallback?.();
        }
      };

      this.currentSource = source;
      source.start(0);
    } catch (e) {
      console.error("Playback error:", e);
      this.isCurrentlyPlaying = false;
    }
  }

  stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {}
      this.currentSource = null;
    }
    this.isCurrentlyPlaying = false;
  }
}

export const GlobalAudio = new AudioManager();

export const prefetchSpeech = (text: string): Promise<Uint8Array | null> => {
  if (speechCache.has(text)) {
    return speechCache.get(text)!;
  }
  const promise = generateSpeech(text);
  speechCache.set(text, promise);
  return promise;
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      // Corrected: contents must be a Content object with parts
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          },
          {
            text: "Transcribe this interview answer exactly as spoken. Do not add any feedback, just the text. If the audio is silent, return an empty string."
          }
        ]
      },
    });

    return response.text?.trim() || "";
  } catch (error) {
    console.error("Transcription Error:", error);
    return "";
  }
};

export const getAiSuggestion = async (question: string): Promise<string> => {
  try {
    const prompt = `
      You are an expert interview coach. Provide a concise, structured ideal answer for: "${question}".
      Rules: No Markdown symbols. Use bullet points (•). Professional tone. Max 150 words.
    `;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Sorry, I couldn't generate a suggestion.";
  } catch (error) {
    return "Unable to connect to AI service.";
  }
};

export const generateQuestions = async (jobDescription: string): Promise<{text: string, type: string}[]> => {
  try {
    const prompt = `Generate 5 interview questions for this job description: "${jobDescription}". Categories: Background, Situational, Technical. Return JSON array.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
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
    return JSON.parse(response.text || "[]");
  } catch (error) {
    return [];
  }
};

/**
 * Manually implement base64 decoding as per guideline examples.
 */
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export const generateSpeech = async (text: string): Promise<Uint8Array | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      // Corrected: contents structure following the SDK best practices
      contents: { parts: [{ text: text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // CONSISTENT NATURAL VOICE
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    return decode(base64Audio);
  } catch (error) {
    return null;
  }
};
