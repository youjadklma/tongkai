import { GoogleGenAI, Modality } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Fetches the Chinese definition for an English word using Gemini Flash.
 */
export const getWordDefinition = async (word: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      // Improved prompt to be more direct and robust
      contents: `You are a dictionary. Translate the English word "${word}" to Chinese. Respond with ONLY the Chinese definition. Do not include pinyin, example sentences, or any introductory text.`,
      config: {
        maxOutputTokens: 100, // Increased to prevent truncation
        temperature: 0.1,    // Lower temperature for consistent answers
      }
    });
    return response.text?.trim() || "暂无释义";
  } catch (error) {
    console.error("Definition fetch error:", error);
    return "查询失败";
  }
};

/**
 * Generates audio for a word using Gemini TTS.
 * Returns raw PCM data (ArrayBuffer).
 */
export const getWordAudio = async (text: string): Promise<ArrayBuffer | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Clear female voice suitable for teaching
          },
        },
      },
    });

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
    console.error("TTS error:", error);
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
  // Ensure we can create an Int16Array (length must be multiple of 2)
  if (rawBuffer.byteLength % 2 !== 0) {
     rawBuffer = rawBuffer.slice(0, rawBuffer.byteLength - 1);
  }

  const dataInt16 = new Int16Array(rawBuffer);
  const frameCount = dataInt16.length / numChannels;
  const audioBuffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Normalize Int16 to Float32 (-1.0 to 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return audioBuffer;
};

/**
 * Helper to play audio buffer.
 * Manually decodes raw PCM data since it lacks standard file headers.
 */
export const playAudioBuffer = async (audioBuffer: ArrayBuffer) => {
    // Initialize AudioContext with the correct sample rate for Gemini TTS (24kHz)
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass({ sampleRate: 24000 });
    
    try {
        // Manually decode PCM instead of using decodeAudioData (which fails for raw PCM)
        const decodedBuffer = decodePCMToAudioBuffer(audioBuffer, audioContext);
        
        const source = audioContext.createBufferSource();
        source.buffer = decodedBuffer;
        source.connect(audioContext.destination);
        source.start(0);
    } catch (e) {
        console.error("Audio playback error", e);
    }
}