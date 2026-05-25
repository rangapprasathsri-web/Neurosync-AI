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

    // Limit text to 200 chars for google-tts-api to avoid errors, or fallback to long format
    let audioUrls = [];
    if (text.length > 200) {
       const results = googleTTS.getAllAudioUrls(text, {
          lang: hintCode,
          slow: false,
          host: 'https://translate.google.com',
          splitPunct: ',.?'
       });
       audioUrls = results.map(r => r.url);
    } else {
       audioUrls = [
          googleTTS.getAudioUrl(text, {
            lang: hintCode,
            slow: false,
            host: 'https://translate.google.com',
          })
       ];
    }

    return res.status(200).json({ audioUrls });
  } catch (error) {
    console.error('TTS error:', error);
    return res.status(500).json({ error: 'Failed to generate speech' });
  }
}
