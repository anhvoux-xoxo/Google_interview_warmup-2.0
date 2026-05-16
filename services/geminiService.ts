
export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  try {
    const response = await fetch("/api/gemini/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64Audio, mimeType }),
    });
    const data = await response.json();
    const transcript = data.text?.trim() || "";
    
    // Clean up as before
    let cleaned = transcript
      .replace(/\[\[EMPTY_AUDIO\]\]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*\)/g, '')
      .trim();

    const low = cleaned.toLowerCase();
    const thirdPersonHallucinations = [
        "he's really trying", "doing a really good job", "impressed with him", 
        "yeah he is", "very impressed", "good job he", "he is doing",
        "she's really", "doing a good job", "impressed with her",
        "trying and doing", "is really trying", "doing a good", 
        "he is doing", "she is doing", "job he", "job she"
    ];

    if (thirdPersonHallucinations.some(h => low.includes(h))) {
        if (cleaned.split(' ').length < 25) return "";
    }

    if (low.includes("watching") && (low.includes("thank") || low.includes("please"))) {
        if (cleaned.split(' ').length < 15) return "";
    }
      
    return cleaned;
  } catch (error) {
    console.error("Transcription Error:", error);
    return "";
  }
};

export const getAiSuggestion = async (question: string): Promise<string> => {
  try {
    const response = await fetch("/api/gemini/suggestion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await response.json();
    return data.text || "Sorry, I couldn't generate a suggestion at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to connect to AI service. Please try again later.";
  }
};

export const generateQuestions = async (jobDescription: string): Promise<{text: string, type: string}[]> => {
  try {
    const response = await fetch("/api/gemini/generate-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobDescription }),
    });
    const questions = await response.json();
    return Array.isArray(questions) ? questions : [];
  } catch (error) {
    console.error("Gemini API Error:", error);
    return [
      { text: "Can you describe your relevant experience?", type: "Background" },
      { text: "Why are you interested in this role?", type: "Background" },
      { text: "How do you deal with pressure?", type: "Situational" },
      { text: "What are your technical strengths?", type: "Technical" },
      { text: "Where do you see yourself in 5 years?", type: "Background" }
    ];
  }
};

export const generateSpeech = async (text: string): Promise<Uint8Array | null> => {
  try {
    const response = await fetch("/api/gemini/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const resData = await response.json();
    const base64Audio = resData.data;
    if (!base64Audio) return null;

    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    return null;
  }
};

export async function decodePCM(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
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

export class GlobalAudio {
  private static context: AudioContext | null = null;
  private static currentSource: AudioBufferSourceNode | null = null;

  static init() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.context = new AudioContextClass({ sampleRate: 24000 });
    }
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    return this.context;
  }

  static stop() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (e) {}
      this.currentSource = null;
    }
  }

  static async playSpeech(audioPromise: Promise<AudioBuffer | null>, onEnded?: () => void) {
    this.stop();
    const ctx = this.init();
    const buffer = await audioPromise;
    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => {
      if (this.currentSource === source) {
        this.currentSource = null;
        onEnded?.();
      }
    };
    this.currentSource = source;
    source.start(0);
  }
}

export const prefetchSpeech = async (text: string): Promise<AudioBuffer | null> => {
  const pcmData = await generateSpeech(text);
  if (!pcmData) return null;
  const ctx = GlobalAudio.init();
  return decodePCM(pcmData, ctx);
};
