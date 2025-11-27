import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { CORE_DICTIONARY } from './dictionary';

let aiClient: GoogleGenAI | null = null;
let sharedAudioContext: AudioContext | null = null;
const API_TIMEOUT_MS = 3000; // 3 seconds timeout for Chinese intranet environments

// Basic Dictionary for common primary school vocabulary
const LOCAL_DICTIONARY: Record<string, string> = CORE_DICTIONARY;

// --- Audio Cache for Letters (A-Z) ---
// Acts as a fast in-memory store for the 26 audio files
const letterAudioCache: Record<string, HTMLAudioElement> = {};

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
 * Checks local dictionary first for instant response.
 */
export const getWordDefinition = async (word: string): Promise<string> => {
  if (!word) return "";
  
  // 1. Check Local Dictionary
  const lowerWord = word.toLowerCase().trim();
  if (LOCAL_DICTIONARY[lowerWord]) {
      return LOCAL_DICTIONARY[lowerWord];
  }

  // 2. Fallback to Gemini
  try {
    const ai = getAiClient();
    const response = await withTimeout(
        ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are a dictionary. Translate the English word "${word}" to Chinese. Respond with ONLY the Chinese definition (e.g., "苹果"). Do not include pinyin, example sentences, or any introductory text. If the word is invalid or a typo, try to guess or return empty string.`,
        config: {
            maxOutputTokens: 20, // Reduced tokens for speed
            temperature: 0.1,
        }
        }),
        API_TIMEOUT_MS
    ) as GenerateContentResponse;
    return response.text?.trim() || "";
  } catch (error) {
    console.warn("Definition fetch failed (Offline/Error):", error);
    // Return empty string on error so UI doesn't show error message in the input field
    return "";
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
 * Gets or creates the shared AudioContext.
 * Handles browser suspension state.
 */
const getSharedAudioContext = (): AudioContext => {
  if (!sharedAudioContext) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    // Use system default sample rate. Do NOT force a specific rate in constructor 
    // as it causes failures on many browsers/devices.
    sharedAudioContext = new AudioContextClass();
  }
  
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(e => console.error("Audio resume failed", e));
  }
  
  return sharedAudioContext;
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
  
  // Create buffer with the specific sample rate of the source audio (24kHz).
  // The AudioContext (usually 44.1k or 48k) will handle resampling automatically during playback.
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
    try {
        const audioContext = getSharedAudioContext();
        const decodedBuffer = decodePCMToAudioBuffer(audioBuffer, audioContext);
        
        const source = audioContext.createBufferSource();
        source.buffer = decodedBuffer;
        source.connect(audioContext.destination);
        
        // No need to close context in onended, as it is shared.
        source.start(0);
    } catch (e) {
        console.error("Audio playback error", e);
    }
}

/**
 * Plays audio from a URL using HTML5 Audio (Bypasses CORS for simple playback)
 */
export const playExternalAudio = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    let resolved = false;

    const handleSuccess = () => {
      if (!resolved) {
          resolved = true;
          resolve();
      }
    };

    const handleError = () => {
      if (!resolved) {
          resolved = true;
          reject(new Error("Audio playback failed"));
      }
    };

    audio.onplay = handleSuccess;
    audio.onerror = handleError;

    // Set a timeout to prevent hanging
    setTimeout(() => handleError(), 3000);

    audio.play().catch(handleError);
  });
};

/**
 * Specialized Player for Single Letters.
 * Uses a caching mechanism to ensure typing feedback is instant.
 * Source: Youdao Dictionary Audio (Type 2 = American English)
 */
export const playLetterAudio = (char: string) => {
    // 1. Validation: Ensure it's a single letter
    const lowerChar = char.toLowerCase();
    if (!/^[a-z]$/.test(lowerChar)) return;

    // 2. Check Cache (Instant Playback)
    if (letterAudioCache[lowerChar]) {
        const audio = letterAudioCache[lowerChar];
        audio.currentTime = 0;
        audio.play().catch(e => console.warn("Cached letter playback interrupted", e));
        return;
    }

    // 3. Create, Cache, and Play (First time)
    // We use Youdao as the source for the 26 letter audio files as they are high quality and consistent.
    const url = `https://dict.youdao.com/dictvoice?audio=${lowerChar}&type=2`;
    const audio = new Audio(url);
    
    // Store in cache
    letterAudioCache[lowerChar] = audio;

    audio.play().catch(e => {
        console.warn("Letter playback failed, falling back to synthesis", e);
        // Fallback to browser TTS if file fails
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            const msg = new SpeechSynthesisUtterance(char.toUpperCase());
            msg.lang = 'en-US';
            msg.rate = 1.5;
            window.speechSynthesis.speak(msg);
        }
    });
};