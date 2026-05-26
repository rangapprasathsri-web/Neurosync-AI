import { useState, useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const useSpeechRecognition = (language: string, onFinalTranscript: (text: string) => void, sensitivity: number = 0.5) => {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(isListening);
  const onFinalRef = useRef(onFinalTranscript);
  const languageRef = useRef(language);
  const sensitivityRef = useRef(sensitivity);

  // Sync refs
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    onFinalRef.current = onFinalTranscript;
  }, [onFinalTranscript]);
  
  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

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
      
      // Calculate confidence threshold: sensitivity 1 = threshold 0, sensitivity 0 = threshold 0.9
      const confidenceThreshold = (1 - sensitivityRef.current) * 0.9;

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i][0];
        // Only accept if confidence is above the threshold, or there is no confidence scoring available
        // Sometimes Chrome gives 0.0 for interim, or Safari lacks it. Only filter if we have a valid non-zero confidence score that falls below threshold.
        if (event.results[i].isFinal) {
          const confidence = result.confidence;
          // If confidence is tightly given and is too low, we filter it. (0 is often a fallback for "I don't know")
          if (typeof confidence === 'number' && confidence > 0 && confidence < confidenceThreshold) {
             console.log(`Filtered out low confidence final transcript: "${result.transcript}" (Conf: ${confidence.toFixed(2)} < ${confidenceThreshold.toFixed(2)})`);
          } else {
             finalTranscriptChunk += result.transcript;
          }
        } else {
          currentInterim += result.transcript;
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
      // Ask for mic permissions via standard getUserMedia first.
      // This is necessary because webkitSpeechRecognition sometimes fails to request permissions in iframes
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Immediately stop tracks, we just needed the permission grant
        stream.getTracks().forEach(track => track.stop());
        
        setIsListening(true);
        isListeningRef.current = true;
        startRecognition();
      } catch (err: any) {
        console.error('Microphone permission denied:', err);
        setIsListening(false);
        isListeningRef.current = false;
        setMicError(`Permission error: ${err.message}. Please allow microphone access.`);
      }
    }
  }, [isListening, startRecognition]);

  return { isListening, interimTranscript, toggleListening, micError };
};
