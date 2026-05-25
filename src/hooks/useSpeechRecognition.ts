import { useState, useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const useSpeechRecognition = (language: string, onFinalTranscript: (text: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(isListening);
  const onFinalRef = useRef(onFinalTranscript);
  const languageRef = useRef(language);

  // Sync refs
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  const getBcp47Lang = (lang: string) => {
    if (!lang) return window.navigator.language || 'en-US';
    const langMap: Record<string, string> = {
      'Tamil': 'ta-IN',
      'Hindi': 'hi-IN',
      'Malayalam': 'ml-IN',
      'Marathi': 'mr-IN',
      'English': 'en-US',
      'Telugu': 'te-IN',
      'Kannada': 'kn-IN',
      'Bengali': 'bn-IN',
      'Spanish': 'es-ES',
      'French': 'fr-FR',
      'German': 'de-DE',
      'Japanese': 'ja-JP',
      'Chinese': 'zh-CN'
    };
    return langMap[lang] || lang;
  };

  // Helper to start recognition with a fresh webkitSpeechRecognition instance
  const startRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Clean up if there's any active instance running
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = getBcp47Lang(languageRef.current);

    rec.onresult = (event: any) => {
      let currentInterim = '';
      let finalTranscriptChunk = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptChunk += event.results[i][0].transcript;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }

      setInterimTranscript(currentInterim);
      
      if (finalTranscriptChunk) {
        onFinalRef.current(finalTranscriptChunk.trim());
      }
    };

    rec.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
        isListeningRef.current = false;
        setMicError('Microphone access denied or blocked by iframe. If using preview, try opening the app in a new tab.');
      } else if (event.error === 'no-speech') {
        // Safe to ignore or keep log: Chrome triggers 'no-speech' on brief quiet moments
        console.log('Speech recognition: No speech detected recently.');
      } else if (event.error === 'network') {
        setMicError('Network issue during speech recognition. Check connection.');
      } else {
        setMicError(`Recognition error: ${event.error}`);
      }
    };

    rec.onend = () => {
      // If we are supposed to still be listening (e.g. timeout on silence, network flicker), restart it nicely
      if (isListeningRef.current) {
        console.log('Voice recognition auto-ended. Restarting...');
        setTimeout(() => {
          if (isListeningRef.current) {
            startRecognition();
          }
        }, 300);
      }
    };

    try {
      rec.start();
      recognitionRef.current = rec;
    } catch (e: any) {
      console.error('Recognition start error:', e);
      setMicError(`Could not standard start microphone: ${e.message}`);
    }
  }, []);

  // Sync language selection changes
  useEffect(() => {
    languageRef.current = language;
    if (isListeningRef.current) {
      // Re-trigger/restablish recognition with the new language
      startRecognition();
    }
  }, [language, startRecognition]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const toggleListening = useCallback(async () => {
    setMicError(null);
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError("Speech Recognition API is not supported in this browser. Please use Google Chrome or Edge.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }
      setInterimTranscript('');
    } else {
      // Direct call to startRecognition - webkitSpeechRecognition will ask for permissions natively
      setIsListening(true);
      isListeningRef.current = true;
      startRecognition();
    }
  }, [isListening, startRecognition]);

  return { isListening, interimTranscript, toggleListening, micError };
};
