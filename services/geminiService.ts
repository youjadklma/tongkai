import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
const API_TIMEOUT_MS = 3000; // 3 seconds timeout for Chinese intranet environments

/**
 * Safely gets the Gemini Client instance.
 * Lazy initialization prevents the app from crashing on load if the API Key is missing.
 */
const getAiClient = (): GoogleGenAI => {
  if (aiClient) return aiClient;

  let apiKey = '';
  let baseUrl = '';

  try {
    // Safely access process.env
    if (typeof process !== 'undefined' && process.env) {
      apiKey = process.env.API_KEY || '';
      // Support custom proxy URL for intranet access
      baseUrl = process.env.GEMINI_API_BASE_URL || ''; 
    }
  } catch (e) {
    console.warn("Could not access process.env");
  }

  // Initialize with the key.
  // We allow passing a baseUrl if the user has a proxy setup.
  const options: any = { 
    apiKey: apiKey || 'MISSING_API_KEY_PLACEHOLDER' 
  };
  
  if (baseUrl) {
      options.baseUrl = baseUrl;
  }

  aiClient = new GoogleGenAI(options);
  return aiClient;
};

/**
 * Utility to wrap promises with a timeout
 */
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Request timed out after ${ms}ms`));
        }, ms);

        promise
            .then(value => {
                clearTimeout(timer);
                resolve(value);
            })
            .catch(reason => {
                clearTimeout(timer);
                reject(reason);
            });
    });
};

/**
 * Fetches the Chinese definition for an English word using Gemini Flash.
 */
export const getWordDefinition = async (word: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const response = await withTimeout(
        ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are a dictionary. Translate the English word "${word}" to Chinese. Respond with ONLY the Chinese definition. Do not include pinyin, example sentences, or any introductory text.`,
        config: {
            maxOutputTokens: 100,
            temperature: 0.1,
        }
        }),
        API_TIMEOUT_MS
    ) as GenerateContentResponse;
    return response.text?.trim() || "暂无释义";
  } catch (error) {
    console.warn("Definition fetch failed (Offline mode active):", error);
    return "查询失败(离线)";
  }
};

/**
 * Generates audio for a word using Gemini TTS.
 * Returns raw PCM data (ArrayBuffer).
 */
export const getWordAudio = async (text: string): Promise<ArrayBuffer | null> => {
  try {
    const ai = getAiClient();
    
    const response = await withTimeout(
        ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
            voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' }, 
            },
            },
        },
        }),
        API_TIMEOUT_MS
    ) as GenerateContentResponse;

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    // Decode base64 string to byte array (Raw PCM)
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error) {
    // This catch block is crucial for the Intranet scenario.
    // If timeout or network error occurs, we return null immediately.
    // The calling component will see 'null' and fallback to window.speechSynthesis.
    console.warn("TTS fetch failed (Offline mode active):", error);
    return null;
  }
};

/**
 * Decodes raw PCM data to AudioBuffer.
 * Gemini 2.5 TTS returns 24kHz, 1 channel PCM (Int16) by default.
 */
const decodePCMToAudioBuffer = (
  rawBuffer: ArrayBuffer,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): AudioBuffer => {
  if (rawBuffer.byteLength % 2 !== 0) {
     rawBuffer = rawBuffer.slice(0, rawBuffer.byteLength - 1);
  }

  const dataInt16 = new Int16Array(rawBuffer);
  const frameCount = dataInt16.length / numChannels;
  const audioBuffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return audioBuffer;
};

/**
 * Helper to play audio buffer.
 */
export const playAudioBuffer = async (audioBuffer: ArrayBuffer) => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass({ sampleRate: 24000 });
    
    try {
        const decodedBuffer = decodePCMToAudioBuffer(audioBuffer, audioContext);
        
        const source = audioContext.createBufferSource();
        source.buffer = decodedBuffer;
        source.connect(audioContext.destination);
        
        source.onended = () => {
          audioContext.close();
        };

        source.start(0);
    } catch (e) {
        console.error("Audio playback error", e);
        audioContext.close();
    }
}