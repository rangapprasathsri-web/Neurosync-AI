import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const fallbackDictionary: Record<string, Record<string, string>> = {
  tamil: {
    hello: "வணக்கம்",
    hi: "வணக்கம்",
    "how are you": "நீங்கள் எப்படி இருக்கிறீர்கள்?",
    "how are you?": "நீங்கள் எப்படி இருக்கிறீர்கள்?",
    "good morning": "காலை வணக்கம்",
    "good morning!": "காலை வணக்கம்",
    "thank you": "நன்றி",
    "thank you!": "நன்றி",
    thanks: "நன்றி",
    welcome: "வரவேற்கிறோம்",
    "welcome!": "வரவேற்கிறோம்",
    goodbye: "சென்று வருகிறேன்",
    bye: "சென்று வருகிறேன்",
    "what is your name?": "உங்கள் பெயர் என்ன?",
    "what is your name": "உங்கள் பெயர் என்ன?"
  },
  hindi: {
    hello: "नमस्ते",
    hi: "नमस्ते",
    "how are you": "आप कैसे हैं?",
    "how are you?": "आप कैसे हैं?",
    "good morning": "सुप्रभात",
    "good morning!": "सुप्रभात",
    "thank you": "धन्यवाद",
    "thank you!": "धन्यवाद",
    thanks: "धन्यवाद",
    welcome: "स्वागत है",
    "welcome!": "स्वागत है",
    goodbye: "अलविदा",
    bye: "अलविदा",
    "what is your name?": "आपका नाम क्या है?",
    "what is your name": "आपका नाम क्या है?"
  },
  spanish: {
    hello: "Hola",
    hi: "Hola",
    "how are you": "¿Cómo estás?",
    "how are you?": "¿Cómo estás?",
    "good morning": "Buenos días",
    "good morning!": "Buenos días",
    "thank you": "Gracias",
    "thank you!": "Gracias",
    thanks: "Gracias",
    welcome: "Bienvenido",
    "welcome!": "Bienvenido",
    goodbye: "Adiós",
    bye: "Adiós"
  },
  french: {
    hello: "Bonjour",
    hi: "Salut",
    "how are you": "Comment ça va?",
    "how are you?": "Comment ça va?",
    "good morning": "Bonjour",
    "good morning!": "Bonjour",
    "thank you": "Merci",
    "thank you!": "Merci",
    thanks: "Merci",
    welcome: "Bienvenue",
    "welcome!": "Bienvenue",
    goodbye: "Au revoir",
    bye: "Salut"
  },
  german: {
    hello: "Hallo",
    hi: "Hallo",
    "how are you": "Wie geht es dir?",
    "how are you?": "Wie geht es dir?",
    "good morning": "Guten Morgen",
    "good morning!": "Guten Morgen",
    "thank you": "Danke",
    "thank you!": "Danke",
    thanks: "Danke",
    welcome: "Willkommen",
    "welcome!": "Willkommen",
    goodbye: "Auf Wiedersehen",
    bye: "Tschüss"
  },
  japanese: {
    hello: "こんにちは",
    hi: "やあ",
    "how are you": "お元気ですか？",
    "how are you?": "お元気ですか？",
    "good morning": "おはようございます",
    "good morning!": "おはようございます",
    "thank you": "ありがとうございます",
    "thank you!": "ありがとうございます",
    thanks: "ありがとう",
    welcome: "ようこそ",
    "welcome!": "ようこそ",
    goodbye: "さようなら",
    bye: "またね"
  },
  chinese: {
    hello: "你好",
    hi: "你好",
    "how are you": "你好吗？",
    "how are you?": "你好吗？",
    "good morning": "早上好",
    "good morning!": "早上好",
    "thank you": "谢谢",
    "thank you!": "谢谢",
    thanks: "谢谢",
    welcome: "欢迎",
    "welcome!": "欢迎",
    goodbye: "再见",
    bye: "再见"
  }
};

function getFallbackTranslation(text: string, lang: string): string {
  const cleanText = text.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
  const targetLangLower = lang.toLowerCase();
  
  if (fallbackDictionary[targetLangLower] && fallbackDictionary[targetLangLower][cleanText]) {
    return fallbackDictionary[targetLangLower][cleanText];
  }
  
  if (targetLangLower === 'tamil') return `வணக்கம்: "${text}"`;
  if (targetLangLower === 'hindi') return `नमस्ते: "${text}"`;
  if (targetLangLower === 'spanish') return `Hola: "${text}"`;
  if (targetLangLower === 'french') return `Bonjour: "${text}"`;
  if (targetLangLower === 'german') return `Hallo: "${text}"`;
  if (targetLangLower === 'japanese') return `こんにちは: "${text}"`;
  if (targetLangLower === 'chinese') return `你好: "${text}"`;
  
  return `${text}`;
}

export default async function handler(req: any, res: any) {
  // Common serverless environments can receive requests through GET sometimes, but we require POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { text, targetLanguage } = req.body;
    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Missing text or targetLanguage' });
    }

    let ai: GoogleGenAI | null = null;
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
      ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }

    if (!ai) {
      const simulatedResult = getFallbackTranslation(text, targetLanguage);
      return res.status(200).json({ 
        translatedText: simulatedResult,
        isSimulated: true,
        note: 'Offline fallback used: Provide a valid GEMINI_API_KEY in Vercel settings for full neural translation.'
      });
    }

    const prompt = `You are a professional real-time translator.
Translate the following text to ${targetLanguage}. Maintain the original meaning and tone.
Return ONLY the final translated text, with no markdown formatting.
Text: "${text}"`;

    const fallbackModels = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'];
    let modelIndex = 0;
    let response;
    let currentModel = fallbackModels[modelIndex];
    let hasError = false;
    
    while (modelIndex < fallbackModels.length) {
      try {
        response = await ai.models.generateContent({
          model: currentModel,
          contents: prompt,
        });
        break; // Success
      } catch (error: any) {
        console.error(`Gemini call error on model ${currentModel}:`, error);
        if (modelIndex < fallbackModels.length - 1) {
          modelIndex++;
          currentModel = fallbackModels[modelIndex];
        } else {
          hasError = true;
          break;
        }
      }
    }

    if (hasError || !response || !response.text) {
      const simulatedResult = getFallbackTranslation(text, targetLanguage);
      return res.status(200).json({ 
        translatedText: simulatedResult,
        isSimulated: true,
        note: 'API error fallback used.'
      });
    }

    return res.status(200).json({ 
      translatedText: (response.text || '').trim()
    });
  } catch (error) {
    console.error('Translation serverless error caught:', error);
    const simulatedResult = getFallbackTranslation(req.body?.text || '', req.body?.targetLanguage || 'Tamil');
    return res.status(200).json({ 
      translatedText: simulatedResult,
      isSimulated: true
    });
  }
}
