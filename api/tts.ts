import * as googleTTS from 'google-tts-api';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { text, targetLanguage } = req.body;
    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Missing text or targetLanguage' });
    }

    const langMap: Record<string, string> = {
      'Tamil': 'ta', 'Hindi': 'hi', 'Malayalam': 'ml', 'Marathi': 'mr',
      'English': 'en', 'Telugu': 'te', 'Kannada': 'kn', 'Bengali': 'bn',
      'Spanish': 'es', 'French': 'fr', 'German': 'de', 'Japanese': 'ja', 'Chinese': 'zh'
    };

    const activeLang = targetLanguage === 'Auto Detect' ? 'English' : targetLanguage;
    const hintCode = langMap[activeLang] || activeLang.toLowerCase().substring(0, 2);

    // Fetch audio from translation server-side into base64 format, preventing client CORS issues
    const results = await googleTTS.getAllAudioBase64(text, {
      lang: hintCode,
      slow: false,
      host: 'https://translate.google.com',
      splitPunct: ',.?'
    });
    
    // Construct valid base64 data URIs
    const audioUrls = results.map(r => `data:audio/mp3;base64,${r.base64}`);

    return res.status(200).json({ audioUrls });
  } catch (error) {
    console.error('TTS error:', error);
    return res.status(500).json({ error: 'Failed to generate speech' });
  }
}
