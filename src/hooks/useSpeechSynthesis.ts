import { useState, useEffect, useCallback } from 'react';

// Language detection based on character sets and high-frequency patterns
function detectLanguageFromText(text: string): string | null {
  if (!text) return null;

  // 1. Unicode script / character block checks
  if (/[\u0b80-\u0bff]/.test(text)) return 'Tamil';
  if (/[\u0900-\u097f]/.test(text)) {
    // Hindi and Marathi use Devnagari. Marathi features characters like ळ (\u0933) and common structures
    if (/[\u0933\u0935]/.test(text)) return 'Marathi';
    return 'Hindi';
  }
  if (/[\u0d00-\u0d7f]/.test(text)) return 'Malayalam';
  if (/[\u0c00-\u0c7f]/.test(text)) return 'Telugu';
  if (/[\u0c80-\u0cff]/.test(text)) return 'Kannada';
  if (/[\u0980-\u09ff]/.test(text)) return 'Bengali';
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'Japanese';
  if (/[\u4e00-\u9fa5]/.test(text)) return 'Chinese';

  // 2. High-frequency words and accents for Latin script languages
  const words = text.toLowerCase().split(/\s+/);

  // French markers
  const frenchWords = new Set(['le', 'la', 'les', 'des', 'un', 'une', 'et', 'est', 'dans', 'nous', 'vous', 'avec', 'pour', 'je', 'oui', 'non', 'bonjour']);
  const frenchAccents = /[éèàùçâêîôûëïü]/;
  const frenchScore = words.filter(w => frenchWords.has(w)).length * 3 + (frenchAccents.test(text) ? 4 : 0);

  // Spanish markers
  const spanishWords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'y', 'es', 'en', 'con', 'por', 'para', 'como', 'lo', 'si', 'no', 'hola', 'gracias']);
  const spanishAccents = /[ñáéíóúü]/;
  const spanishScore = words.filter(w => spanishWords.has(w)).length * 3 + (spanishAccents.test(text) ? 4 : 0);

  // German markers
  const germanWords = new Set(['der', 'die', 'das', 'und', 'ist', 'von', 'in', 'mit', 'zu', 'den', 'dem', 'ein', 'eine', 'ja', 'nein', 'wir', 'hallo', 'danke']);
  const germanAccents = /[äöüß]/;
  const germanScore = words.filter(w => germanWords.has(w)).length * 3 + (germanAccents.test(text) ? 4 : 0);

  // English markers
  const englishWords = new Set(['the', 'and', 'is', 'in', 'of', 'to', 'a', 'with', 'for', 'you', 'that', 'it', 'on', 'this', 'yes', 'no', 'are', 'hello', 'thanks']);
  const englishScore = words.filter(w => englishWords.has(w)).length * 3;

  const candidates = [
    { lang: 'French', score: frenchScore },
    { lang: 'Spanish', score: spanishScore },
    { lang: 'German', score: germanScore },
    { lang: 'English', score: englishScore }
  ];

  candidates.sort((a, b) => b.score - a.score);
  if (candidates[0].score > 0) {
    return candidates[0].lang;
  }

  return null;
}

export const useSpeechSynthesis = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingType, setSpeakingType] = useState<'original' | 'translated' | null>(null);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const fetchVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        if (!selectedVoice) {
          const defaultVoice = availableVoices.find(v => v.name.includes('Google') || v.default) || availableVoices[0];
          setSelectedVoice(defaultVoice);
        }
      }
    };

    fetchVoices();
    window.speechSynthesis.onvoiceschanged = fetchVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoice]);

  const speak = useCallback((text: string, langHint?: string, queue: boolean = false, type: 'original' | 'translated' = 'translated') => {
    if (!text || !window.speechSynthesis) {
      console.warn("Cannot speak: No text or speech synthesis not supported");
      return;
    }
    
    setSynthesisError(null);

    // Stop any ongoing speech if not queuing
    if (!queue && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
      window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    (utterance as any).speechType = type;
    
    // Prevent garbage collection bug in Chrome
    if (!(window as any).utterances) {
      (window as any).utterances = [];
    }
    (window as any).utterances.push(utterance);
    
    // Detect the language based on the text itself, fall back to langHint or English
    const detectedLang = detectLanguageFromText(text);
    const activeLang = detectedLang || langHint || 'English';

    let shouldUseServerTTS = true; // Use server TTS to ensure it works for all languages (no missing browser voices)

    
    if (shouldUseServerTTS) {
      setIsSpeaking(true);
      setSpeakingType(type);
      
      fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLanguage: activeLang })
      })
      .then(async res => {
         const contentType = res.headers.get("content-type");
         if (!res.ok) {
            const text = await res.text();
            throw new Error(`HTTP error! status: ${res.status}, body: ${text.slice(0, 50)}`);
         }
         if (!contentType || !contentType.includes("application/json")) {
            throw new Error(`Invalid content type! Expected JSON, got ${contentType}`);
         }
         const text = await res.text();
         if (!text) {
             throw new Error("Empty response body from TTS server");
         }
         let parsed;
         try {
             parsed = JSON.parse(text);
         } catch (e) {
             throw new Error("TTS fetch error: Failed to parse JSON: " + text.slice(0, 50));
         }
         if (parsed.error) {
             throw new Error("Server TTS Error: " + parsed.error);
         }
         return parsed;
      })
      .then(data => {
        if (data.audioUrls && data.audioUrls.length > 0) {
          let currentIndex = 0;
          
          const playNext = () => {
             if (currentIndex >= data.audioUrls.length) {
                setIsSpeaking(false);
                setSpeakingType(null);
                return;
             }
             const audio = new Audio(data.audioUrls[currentIndex]);
             audio.playbackRate = rate;
             audio.onended = () => {
                currentIndex++;
                playNext();
             };
             audio.onerror = () => {
                setIsSpeaking(false);
                setSpeakingType(null);
                setSynthesisError("Failed to play generated audio.");
             };
             (window as any).currentAudio = audio;
             audio.play().catch(e => {
                console.error("Audio playback blocked", e);
                setSynthesisError("Click Troubleshoot Audio to allow playback.");
                setIsSpeaking(false);
                setSpeakingType(null);
             });
          };
          
          playNext();
        } else {
           throw new Error("No audio URLs returned from TTS server");
        }
      })
      .catch(err => {
        console.log("TTS fetch error, falling back to native TTS:", err.message || err);
        // Do native fallback
        runNativeFallback();
      });
      return;
    }
    
    runNativeFallback();
    
    function runNativeFallback() {
      // Auto Voice Detection based on Language (Native Fallback)
      let voiceToUse = selectedVoice;

      if (activeLang) {
        const langMap: Record<string, string> = {
          'Tamil': 'ta', 'ta-IN': 'ta',
          'Hindi': 'hi', 'hi-IN': 'hi',
          'Malayalam': 'ml', 'ml-IN': 'ml',
          'Marathi': 'mr', 'mr-IN': 'mr',
          'English': 'en', 'en-US': 'en',
          'Telugu': 'te', 'te-IN': 'te',
          'Kannada': 'kn', 'kn-IN': 'kn',
          'Bengali': 'bn', 'bn-IN': 'bn',
          'Spanish': 'es', 'es-ES': 'es',
          'French': 'fr', 'fr-FR': 'fr',
          'German': 'de', 'de-DE': 'de',
          'Japanese': 'ja', 'ja-JP': 'ja',
          'Chinese': 'zh', 'zh-CN': 'zh'
        };
        const hintCode = langMap[activeLang] || activeLang.toLowerCase().substring(0, 2);
        
        // Only swap voice if current selectedVoice doesn't match the required language
        if (!selectedVoice || !selectedVoice.lang.toLowerCase().includes(hintCode)) {
          const matchingVoices = voices.filter(v => 
            v.lang.toLowerCase().includes(hintCode) || 
            v.name.toLowerCase().includes(hintCode) ||
            v.name.toLowerCase().includes(activeLang.toLowerCase())
          );
          if (matchingVoices.length > 0) {
            // Prefer Google voices for better quality
            voiceToUse = matchingVoices.find(v => v.name.includes('Google') || v.name.includes('Online')) || matchingVoices[0];
          } else {
            voiceToUse = null; // Don't force current voice if it doesn't match the language
          }
        }
        
        // Set the lang attribute as a fallback so the OS can auto-route if voice is missing
        const bcpTagMap: Record<string, string> = {
          'Tamil': 'ta-IN', 'Hindi': 'hi-IN', 'Malayalam': 'ml-IN', 'Marathi': 'mr-IN', 'English': 'en-US',
          'Telugu': 'te-IN', 'Kannada': 'kn-IN', 'Bengali': 'bn-IN', 
          'Spanish': 'es-ES', 'French': 'fr-FR', 'German': 'de-DE', 
          'Japanese': 'ja-JP', 'Chinese': 'zh-CN'
        };
        utterance.lang = bcpTagMap[activeLang] || langMap[activeLang] || activeLang;
      }

      if (voiceToUse) {
        utterance.voice = voiceToUse;
      }
      
      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setSpeakingType((utterance as any).speechType || 'translated');
      };
      utterance.onend = () => {
        // Check if there are other utterances still playing or queued
        if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
          setIsSpeaking(false);
          setSpeakingType(null);
          (window as any).utterances = []; // Free memory
        }
      };
      utterance.onerror = (e) => {
        console.error("Speech synthesis error", e);
        setSynthesisError(`Synthesis error: ${e.error || 'unspecified'}.`);
        if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
          setIsSpeaking(false);
          setSpeakingType(null);
          (window as any).utterances = []; // Free memory
        }
      };

      console.log(`Speaking queued:[${queue}] type:[${type}] lang:[${langHint}] voice:[${voiceToUse?.name}] text:`, text);

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      if (!queue) {
        // Avoid browser concurrency lock-ups from immediate speak after cancel
        setTimeout(() => {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utterance);
        }, 50);
      } else {
        window.speechSynthesis.speak(utterance);
      }
    }

  }, [selectedVoice, voices, rate, pitch, volume]);
  
  const stop = useCallback(() => {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    if ((window as any).currentAudio) {
        (window as any).currentAudio.pause();
        (window as any).currentAudio.currentTime = 0;
    }
    setIsSpeaking(false);
    setSpeakingType(null);
  }, []);

  const resetEngine = useCallback(() => {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    if ((window as any).currentAudio) {
        (window as any).currentAudio.pause();
        (window as any).currentAudio.currentTime = 0;
    }
    setIsSpeaking(false);
    setSpeakingType(null);
    setSynthesisError(null);
    try {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
          
          // Speak a tiny test utterance directly upon user-click to unlock synthesis permissions
          setTimeout(() => {
            const testUtterance = new SpeechSynthesisUtterance("Audio synthesizer active");
            testUtterance.volume = 0.35;
            testUtterance.rate = 1.1;
            window.speechSynthesis.speak(testUtterance);
            
            // Also unlock standard HTML5 Audio which is used by our server-side TTS fallback
            const dummyAudio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
            dummyAudio.volume = 0.01;
            dummyAudio.play().catch(() => {});
          }, 100);
        } catch (e) {
          console.error("Failed to reset speech engine", e);
        }
  }, []);

  return {
    voices,
    selectedVoice,
    setSelectedVoice,
    isSpeaking,
    speakingType,
    synthesisError,
    rate,
    setRate,
    pitch,
    setPitch,
    volume,
    setVolume,
    speak,
    stop,
    resetEngine
  };
};
