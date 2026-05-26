import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import * as googleTTS from 'google-tts-api';
import path from 'path';
import 'dotenv/config';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  let ai: GoogleGenAI | null = null;
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

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
    malayalam: {
      hello: "നമസ്കാരം",
      hi: "നമസ്കാരം",
      "how are you": "നിങ്ങൾക്ക് സുഖമാണോ?",
      "how are you?": "നിങ്ങൾക്ക് സുഖമാണോ?",
      "good morning": "സുപ്രഭാതം",
      "good morning!": "സുപ്രഭാതം",
      "thank you": "നന്ദി",
      "thank you!": "നന്ദി",
      thanks: "നന്ദി",
      welcome: "സ്വാഗതം",
      "welcome!": "സ്വാഗതം",
      goodbye: "വിട",
      bye: "വിട",
      "what is your name?": "നിങ്ങളുടെ പേരെന്താണ്?",
      "what is your name": "നിങ്ങളുടെ പേരെന്താണ്?"
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
    
    // Friendly, readable simulated translation so synthesis is clean
    if (targetLangLower === 'tamil') return `வணக்கம்: "${text}"`;
    if (targetLangLower === 'hindi') return `नमस्ते: "${text}"`;
    if (targetLangLower === 'spanish') return `Hola: "${text}"`;
    if (targetLangLower === 'french') return `Bonjour: "${text}"`;
    if (targetLangLower === 'german') return `Hallo: "${text}"`;
    if (targetLangLower === 'japanese') return `こんにちは: "${text}"`;
    if (targetLangLower === 'chinese') return `你好: "${text}"`;
    if (targetLangLower === 'malayalam') return `നമസ്കാരം: "${text}"`;
    
    return `${text}`;
  }

  app.post('/api/translate', async (req, res) => {
    try {
      const { text, targetLanguage } = req.body;
      console.log(`Translate requested for length ${text?.length}, target: ${targetLanguage}`);
      if (!text || !targetLanguage) {
        return res.status(400).json({ error: 'Missing text or targetLanguage' });
      }

      const prompt = `You are a professional real-time translator.
Translate the following text to ${targetLanguage}. Maintain the original meaning and tone.
Return ONLY the final translated text, with no markdown formatting.
Text: "${text}"`;

      let translatedText = '';
      let usedModel = '';

      // 1. Try Grok (xAI) if configured
      if (process.env.XAI_API_KEY && process.env.XAI_API_KEY !== 'MY_XAI_API_KEY') {
        try {
          const openai = new OpenAI({
            apiKey: process.env.XAI_API_KEY,
            baseURL: "https://api.x.ai/v1",
          });
          const completion = await openai.chat.completions.create({
            messages: [
              { role: "system", content: "You are a professional real-time translator." },
              { role: "user", content: `Translate the following text to ${targetLanguage}. Maintain the original meaning and tone. Return ONLY the final translated text, with no markdown formatting.\nText: "${text}"` }
            ],
            model: "grok-2-latest",
          });
          
          if (completion.choices[0]?.message?.content) {
            translatedText = completion.choices[0].message.content.trim();
            usedModel = 'grok';
          }
        } catch (grokError: any) {
          console.warn(`[Grok] Translation failed (${grokError.status || grokError.message || 'Error'}). Falling back to Gemini.`);
        }
      }

      // 2. Try Gemini if Grok failed or is not configured
      if (!translatedText && ai) {
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

        if (!hasError && response && response.text) {
          translatedText = "⚡ " + response.text.trim();
          usedModel = 'gemini';
        }
      }

      // 3. Try Auto-Translate Fallback if both failed
      if (!translatedText) {
        try {
          const langMapIso: Record<string, string> = {
            'tamil': 'ta', 'hindi': 'hi', 'malayalam': 'ml', 'marathi': 'mr',
            'english': 'en', 'telugu': 'te', 'kannada': 'kn', 'bengali': 'bn',
            'spanish': 'es', 'french': 'fr', 'german': 'de', 'japanese': 'ja', 'chinese': 'zh-CN'
          };
          const isoTarget = langMapIso[targetLanguage.toLowerCase()] || 'en';
          
          const gtRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${isoTarget}&dt=t&q=${encodeURIComponent(text)}`);
          const gtData = await gtRes.json();
          if (gtData && gtData[0]) {
            translatedText = "⚡ " + gtData[0].map((x: any) => x[0]).join('');
            usedModel = 'google-translate-free';
          }
        } catch (e) {
          console.error("Google Translate fallback failed", e);
        }
      }

      if (!translatedText) {
        const simulatedResult = getFallbackTranslation(text, targetLanguage);
        return res.json({ 
          translatedText: `[DIAG]: failed to translate text. Gemini model error check. ` + simulatedResult,
          isSimulated: true,
          note: `All translation API attempts failed.`
        });
      }

      res.json({ 
        translatedText: translatedText,
        model: usedModel
      });
    } catch (error: any) {
      console.error('Translation server-side crash caught successfully:', error);
      // Ensure zero crash/failure
      const simulatedResult = getFallbackTranslation(req.body?.text || '', req.body?.targetLanguage || 'Tamil');
      res.json({ 
        translatedText: `[CRASH]: ${error.message} ` + simulatedResult,
        isSimulated: true
      });
    }
  });

  app.post('/api/tts', async (req, res) => {
    try {
      let { text, targetLanguage } = req.body;
      if (!text || !targetLanguage) {
        return res.status(400).json({ error: 'Missing text or targetLanguage' });
      }
      
      text = text.replace('⚡ ', '').replace('[DIAG]: ', '').replace('[CRASH]: ', '');

      const langMap: Record<string, string> = {
        'Tamil': 'ta', 'Hindi': 'hi', 'Malayalam': 'ml', 'Marathi': 'mr',
        'English': 'en', 'Telugu': 'te', 'Kannada': 'kn', 'Bengali': 'bn',
        'Spanish': 'es', 'French': 'fr', 'German': 'de', 'Japanese': 'ja', 'Chinese': 'zh'
      };

      const activeLang = targetLanguage === 'Auto Detect' ? 'English' : targetLanguage;
      const hintCode = langMap[activeLang] || activeLang.toLowerCase().substring(0, 2);

      console.log(`TTS requested for length ${text.length}, lang: ${targetLanguage}, hint: ${hintCode}`);
      // Fetch audio from translation server-side into base64 format, preventing client CORS issues
      const results = await googleTTS.getAllAudioBase64(text, {
        lang: hintCode,
        slow: false,
        host: 'https://translate.google.com',
        splitPunct: ',.?'
      });
      
      // Construct valid base64 data URIs
      const audioUrls = results.map((r: any) => `data:audio/mp3;base64,${r.base64}`);

      res.status(200).json({ audioUrls });
    } catch (error: any) {
      console.warn(`[TTS Server] Error generating speech: ${error.message || 'Unknown error'}. Client will use native fallback.`);
      res.status(503).json({ error: 'Failed to generate speech via Server TTS' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
