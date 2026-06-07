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
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
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
    
    return `${text}`;
  }

  app.post('/api/translate', async (req, res) => {
    try {
      const { text, targetLanguage } = req.body;
      console.log(`Translate requested for length ${text?.length}, target: ${targetLanguage}`);
      if (!text || !targetLanguage) {
        return res.status(400).json({ error: 'Missing text or targetLanguage' });
      }

      const langMapIso: Record<string, string> = {
        'tamil': 'ta', 'hindi': 'hi', 'malayalam': 'ml', 'marathi': 'mr',
        'english': 'en', 'telugu': 'te', 'kannada': 'kn', 'bengali': 'bn',
        'spanish': 'es', 'french': 'fr', 'german': 'de', 'japanese': 'ja', 
        'chinese': 'zh-CN', 'chinese (simplified)': 'zh-CN'
      };
      const isoTarget = langMapIso[targetLanguage.toLowerCase().trim()] || 'en';

      let translatedText = '';
      let usedModel = '';

      // Method 0: Official Gemini 3.5 Flash API (highly accurate, contextual)
      if (ai) {
        try {
          const geminePrompt = `You are a professional real-time translator.
Translate the following text to ${targetLanguage}. Maintain the original meaning and tone.
Return ONLY the final translated text, with absolutely no markdown formatting, no outer quotes, and no preambles.
Text to translate: "${text}"`;

          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: geminePrompt,
          });
          
          if (response?.text) {
            translatedText = response.text.trim();
            // Remove lingering wrap quotes that LLMs sometimes output
            if (translatedText.startsWith('"') && translatedText.endsWith('"')) {
              translatedText = translatedText.substring(1, translatedText.length - 1);
            }
            usedModel = 'gemini';
          }
        } catch (geminiError: any) {
          console.error('Gemini translation helper error:', geminiError.message || geminiError);
        }
      }

      // Method 1: clients5 google translate (ultra fast, highly accurate)
      if (!translatedText) {
        try {
          const res5 = await fetch(`https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${isoTarget}&q=${encodeURIComponent(text)}`);
          if (res5.ok) {
            const data5 = await res5.json();
            if (data5 && data5[0]) {
              if (typeof data5[0] === 'string') {
                translatedText = data5[0];
              } else if (Array.isArray(data5[0]) && typeof data5[0][0] === 'string') {
                translatedText = data5[0][0];
              }
              if (translatedText) {
                usedModel = 'google-translate';
              }
            }
          }
        } catch(e) { 
          console.error("Chrome GT failed", e); 
        }
      }

      // Method 2: gtx google translate (robust backup)
      if (!translatedText) {
        try {
          const gtRes = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${isoTarget}&dt=t&q=${encodeURIComponent(text)}`);
          if (gtRes.ok) {
            const gtData = await gtRes.json();
            if (gtData && gtData[0]) {
              translatedText = gtData[0].map((x: any) => x[0]).join('');
              usedModel = 'google-translate';
            }
          }
        } catch (e) { 
          console.error("GTX fallback failed", e); 
        }
      }

      // Method 3: MyMemory free api (backup)
      if (!translatedText) {
        try {
          const mmRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${isoTarget}`);
          if (mmRes.ok) {
            const mmData = await mmRes.json();
            if (mmData && mmData.responseData && mmData.responseData.translatedText) {
              translatedText = mmData.responseData.translatedText;
              usedModel = 'mymemory-free';
            }
          }
        } catch(e) { 
          console.error("MyMemory failed", e); 
        }
      }

      // Method 4: Offline dict lookup fallback
      if (!translatedText) {
        translatedText = getFallbackTranslation(text, targetLanguage);
        usedModel = 'offline-dictionary';
      }

      res.json({ 
        translatedText: translatedText,
        model: usedModel
      });
    } catch (error: any) {
      console.error('Translation server-side crash caught successfully:', error);
      const simulatedResult = getFallbackTranslation(req.body?.text || '', req.body?.targetLanguage || 'Tamil');
      res.json({ 
        translatedText: simulatedResult,
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
      res.status(200).json({ error: 'Failed to generate speech via Server TTS' });
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
