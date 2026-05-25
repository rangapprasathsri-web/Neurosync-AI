import { useState, useCallback, useEffect, useRef, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Settings, Volume2, Globe, Sparkles, Download, Copy, Speaker, Play, Square, Settings2, Languages, Wand2, Save, History, X, Trash2 } from 'lucide-react';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import LanguageDetect from 'languagedetect';
import { TranscriptEntity, SavedSession } from './types';
import { AudioVisualizer } from './components/AudioVisualizer';
import { RoboAvatar } from './components/RoboAvatar';

const lngDetector = new LanguageDetect();

const INITIAL_LANGUAGES = [
  { code: 'English', label: 'English' },
  { code: 'Tamil', label: 'Tamil' },
  { code: 'Hindi', label: 'Hindi' },
  { code: 'Malayalam', label: 'Malayalam' },
  { code: 'Marathi', label: 'Marathi' },
  { code: 'Telugu', label: 'Telugu' },
  { code: 'Kannada', label: 'Kannada' },
  { code: 'Bengali', label: 'Bengali' },
  { code: 'Spanish', label: 'Spanish' },
  { code: 'French', label: 'French' },
  { code: 'German', label: 'German' },
  { code: 'Japanese', label: 'Japanese' },
  { code: 'Chinese', label: 'Chinese (Simplified)' }
];

const INPUT_LANGUAGES = [
  { code: '', label: 'Auto-Detect (Browser Default)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'ta-IN', label: 'Tamil' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'ml-IN', label: 'Malayalam' },
  { code: 'mr-IN', label: 'Marathi' },
  { code: 'te-IN', label: 'Telugu' },
  { code: 'kn-IN', label: 'Kannada' },
  { code: 'bn-IN', label: 'Bengali' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
  { code: 'ja-JP', label: 'Japanese' },
  { code: 'zh-CN', label: 'Chinese' }
];

export default function App() {
  const [transcripts, setTranscripts] = useState<TranscriptEntity[]>([]);
  const [pastSessions, setPastSessions] = useState<SavedSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [languages, setLanguages] = useState(INITIAL_LANGUAGES);
  const [targetLanguage, setTargetLanguage] = useState('Tamil');
  const [inputLanguage, setInputLanguage] = useState('');
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('neurosync_sessions');
      if (stored) {
        setPastSessions(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  const saveCurrentSession = () => {
    if (transcripts.length === 0) return;
    const title = transcripts[0].originalText.length > 30 
      ? transcripts[0].originalText.substring(0, 30) + '...' 
      : transcripts[0].originalText;
      
    const newSession: SavedSession = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      transcripts: [...transcripts],
      title: title || 'Untitled Session'
    };
    const updated = [newSession, ...pastSessions];
    setPastSessions(updated);
    localStorage.setItem('neurosync_sessions', JSON.stringify(updated));
    clearTranscripts();
  };

  const loadSession = (session: SavedSession) => {
    setTranscripts(session.transcripts);
    setShowHistory(false);
  };
  
  const deleteSession = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    const updated = pastSessions.filter(s => s.id !== id);
    setPastSessions(updated);
    localStorage.setItem('neurosync_sessions', JSON.stringify(updated));
  };

  const transcriptsEndRef = useRef<HTMLDivElement>(null);

  const {
    voices, selectedVoice, setSelectedVoice, isSpeaking, speakingType, synthesisError,
    rate, setRate, pitch, setPitch, speak, stop, resetEngine
  } = useSpeechSynthesis();

  const [activeTone, setActiveTone] = useState('Standard');

  const handleToneChange = (newTone: string) => {
    setActiveTone(newTone);
    if (newTone === 'Standard') { setPitch(1); setRate(1); }
    else if (newTone === 'Friendly') { setPitch(1.2); setRate(1.1); }
    else if (newTone === 'Formal') { setPitch(0.9); setRate(0.9); }
    else if (newTone === 'Assistant') { setPitch(1.1); setRate(1.0); }
    else if (newTone === 'Robotic AI') { setPitch(0.5); setRate(0.85); }
  };

  const getLangLabel = (code: string) => INPUT_LANGUAGES.find(l => l.code === code)?.label || code;

  const handleTranslate = async (id: string, text: string, targetLang: string, detectedLang?: string) => {
    setIsProcessing(true);
    try {
      const fullTargetLang = getLangLabel(targetLang);
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLanguage: fullTargetLang })
      });
      
      if (!response.ok) {
        const errText = await response.text();
        console.error("SERVER ERROR HTML DUMP:", errText);
        throw new Error(`HTTP ${response.status}: ${errText.slice(0, 100)}`);
      }
      
      const data = await response.json();
      const translated = data.translatedText || text;
      
      setTranscripts(prev => prev.map(t => {
        if (t.id === id) {
          const currentTranslations = t.translations || [];
          const filtered = currentTranslations.filter(item => item.language.toLowerCase() !== targetLang.toLowerCase());
          const updatedTranslations = [...filtered, { language: targetLang, text: translated }];
          
          return {
            ...t,
            translatedText: translated,
            translations: updatedTranslations,
            isFinal: true
          };
        }
        return t;
      }));

      if (autoSpeak) {
        let textLang = detectedLang || inputLanguage || 'English';
        // When auto translation happens continuously, we shouldn't cancel the queue,
        // otherwise sentences will cut each other off rapidly!
        speak(text, textLang, true, 'original');          // Queue the original
        speak(translated, targetLang, true, 'translated');  // Queue the translated text
      }
    } catch (err: any) {
      console.error('Translation error:', err);
      const errMsg = err?.message || String(err);
      setTranscripts(prev => prev.map(t => 
        t.id === id ? { ...t, translatedText: `Translation error: ${errMsg}`, isFinal: true } : t
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTranslateAll = async () => {
    for (const t of transcripts) {
      const currentTranslations = t.translations || [];
      const alreadyHasLang = currentTranslations.some(item => item.language.toLowerCase() === targetLanguage.toLowerCase());
      if (!alreadyHasLang) {
        await handleTranslate(t.id, t.originalText, targetLanguage, t.detectedLanguage);
      }
    }
  };

  const handleSpeakTranscribed = () => {
    // If they have distinct detected languages it's hard to speak them all in one go with one language,
    // so we'll just try to use the most common one or the last one, or fall back to English.
    // For simplicity, we just use the first detected language in the list if available.
    const detected = transcripts.length > 0 ? transcripts[0].detectedLanguage : undefined;
    const textToSpeak = transcripts.map(t => t.originalText).filter(Boolean).join('. ');
    if (textToSpeak) {
      speak(textToSpeak, detected || inputLanguage || 'English', false, 'original');
    }
  };

  const handleSpeakTranslated = () => {
    const textToSpeak = transcripts.map(t => t.translatedText).filter(Boolean).join('. ');
    if (textToSpeak) {
      speak(textToSpeak, targetLanguage, false, 'translated');
    }
  };

  const { isListening, interimTranscript, toggleListening, micError } = useSpeechRecognition(inputLanguage, (text) => {
    const newId = Date.now().toString();
    let detectedLangName = '';
    try {
      const detectRes = lngDetector.detect(text, 1);
      detectedLangName = (!inputLanguage && detectRes.length > 0) 
        ? detectRes[0][0].charAt(0).toUpperCase() + detectRes[0][0].slice(1)
        : '';
    } catch(e) {
      console.error('Language detection err', e);
    }
      
    setTranscripts(prev => [...prev, { id: newId, originalText: text, translatedText: '', isFinal: false, timestamp: Date.now(), detectedLanguage: detectedLangName }]);
    
    if (autoTranslate) {
      handleTranslate(newId, text, targetLanguage, detectedLangName);
    } else {
      setTranscripts(prev => prev.map(t => 
        t.id === newId ? { ...t, isFinal: true } : t
      ));
    }
  });

  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, interimTranscript]);

  // Auto select voice when target language changes
  useEffect(() => {
    if (voices.length === 0) return;
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
    const activeLang = targetLanguage === 'Auto Detect' ? 'English' : targetLanguage;
    const hintCode = langMap[activeLang] || activeLang.toLowerCase().substring(0, 2);
    
    setSelectedVoice((currentSelected) => {
      if (currentSelected && currentSelected.lang.toLowerCase().includes(hintCode)) {
        return currentSelected;
      }
      const matchingVoices = voices.filter(v => v.lang.toLowerCase().includes(hintCode));
      if (matchingVoices.length > 0) {
        return matchingVoices.find(v => v.name.includes('Google')) || matchingVoices[0];
      }
      return currentSelected;
    });
  }, [targetLanguage, voices, setSelectedVoice]);

  const copyToClipboard = () => {
    const text = transcripts.map(t => `${t.originalText}\n${t.translatedText}`).join('\n\n');
    navigator.clipboard.writeText(text);
  };

  const clearTranscripts = () => {
    setTranscripts([]);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault(); // Prevent page scroll
        toggleListening();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        handleTranslateAll();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleListening, transcripts, targetLanguage]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200 font-sans selection:bg-cyan-500/30">
      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col h-screen">
        
        {/* Header */}
        <header className="flex items-center justify-between pb-6 border-b border-white/10 mb-6 shrink-0 z-10 relative">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-medium tracking-tight text-white">NeuroSync AI</h1>
              <p className="text-xs text-slate-400 font-mono">Live Cortex Translation V1.2</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button onClick={() => setShowHistory(true)} className="p-2 rounded-lg hover:bg-white/5 transition-colors relative" title="View History">
              <History className="w-5 h-5 text-slate-400" />
              {pastSessions.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-500"></span>}
            </button>
            <button onClick={saveCurrentSession} disabled={transcripts.length === 0} className="p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Save Session">
              <Save className="w-5 h-5 text-slate-400" />
            </button>
            <button onClick={copyToClipboard} className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="Copy All">
              <Copy className="w-5 h-5 text-slate-400" />
            </button>
            <button onClick={clearTranscripts} className="px-4 py-2 text-sm font-medium bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5">
              Clear
            </button>
          </div>
        </header>

        {/* Main Workspace */}
        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 relative z-10">
          
          {/* Left Column: Input & Recognition */}
          <div className="w-full lg:w-1/2 flex flex-col gap-6">
            <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col relative overflow-hidden backdrop-blur-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                <h2 className="text-sm font-medium tracking-wide text-slate-400 uppercase flex items-center gap-2">
                  <Mic className="w-4 h-4" /> Original Audio
                </h2>
                
                <div className="flex items-center gap-3">
                  {isListening && (
                    <span className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs font-mono text-red-400">REC</span>
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                     <span className="text-xs text-slate-500 uppercase">Input:</span>
                     <select 
                       value={inputLanguage}
                       onChange={(e) => setInputLanguage(e.target.value)}
                       className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 max-w-[120px] truncate"
                     >
                       {INPUT_LANGUAGES.map(lang => (
                         <option key={lang.code} value={lang.code}>{lang.label}</option>
                       ))}
                     </select>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                <AnimatePresence initial={false}>
                  {transcripts.map((t) => (
                    <motion.div 
                      key={t.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="group flex flex-col gap-2 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-full">
                          <p className="text-lg leading-relaxed text-slate-300">
                            {t.originalText}
                          </p>
                          {t.detectedLanguage && !inputLanguage && (
                            <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider text-cyan-500/70 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                              {t.detectedLanguage}
                            </span>
                          )}
                        </div>
                        <div className="flex opacity-0 group-hover:opacity-100 transition-all shrink-0 space-x-2 pl-2">
                           <button onClick={(e) => { e.stopPropagation(); speak(t.originalText, t.detectedLanguage || inputLanguage || 'English', false, 'original'); }} title="Dictate Original" className="p-2 bg-white/10 rounded-md hover:bg-cyan-500/20 hover:text-cyan-400 transition-all">
                             <Volume2 className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => handleTranslate(t.id, t.originalText, targetLanguage, t.detectedLanguage)} 
                             title={`Translate to ${targetLanguage}`} 
                             className="p-2 bg-white/10 rounded-md hover:bg-cyan-500/20 hover:text-cyan-400 transition-all text-cyan-400/80"
                           >
                             <Languages className="w-4 h-4" />
                           </button>
                        </div>
                      </div>
                      
                      {t.translations && t.translations.length > 0 ? (
                        <div className="space-y-2 pt-2 border-t border-white/5 mt-1">
                          {t.translations.map((trans, index) => (
                            <div key={index} className="flex items-start justify-between bg-cyan-950/10 p-2.5 rounded-lg border border-cyan-500/5 group/trans hover:bg-cyan-950/20 transition-all">
                              <div className="space-y-0.5">
                                <span className="inline-block text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                                  {getLangLabel(trans.language)}
                                </span>
                                <p className="text-base leading-relaxed text-cyan-200 font-medium">
                                  {trans.text}
                                </p>
                              </div>
                              <div className="flex opacity-0 group-hover/trans:opacity-100 transition-all shrink-0 space-x-1 pl-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); speak(trans.text, trans.language, false, 'translated'); }} 
                                  title={`Dictate Translated (${getLangLabel(trans.language)})`} 
                                  className="p-1 px-1.5 bg-indigo-500/10 rounded hover:bg-indigo-500/20 hover:text-indigo-400 transition-all text-indigo-400/70 text-xs flex items-center gap-1"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(trans.text);
                                  }} 
                                  title="Copy translation" 
                                  className="p-1 px-1.5 bg-white/5 rounded hover:bg-white/10 hover:text-cyan-400 transition-all text-slate-400 text-xs"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : t.translatedText ? (
                        <div className="flex items-start justify-between pt-2 border-t border-white/5 mt-1">
                          <p className="text-lg leading-relaxed text-cyan-200 w-full font-medium">
                            {t.translatedText}
                          </p>
                          <div className="flex opacity-0 group-hover:opacity-100 transition-all shrink-0 space-x-2 pl-2">
                             <button onClick={(e) => { e.stopPropagation(); speak(t.translatedText, targetLanguage, false, 'translated'); }} title="Dictate Translated" className="p-2 bg-indigo-500/10 rounded-md hover:bg-indigo-500/20 hover:text-indigo-400 transition-all text-indigo-400/70">
                               <Volume2 className="w-4 h-4" />
                             </button>
                          </div>
                        </div>
                      ) : null}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {interimTranscript && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-lg leading-relaxed text-cyan-400 italic">
                    {interimTranscript}
                  </motion.div>
                )}
                <div ref={transcriptsEndRef} />
              </div>

              {/* Mic Controls */}
              {micError ? (
                <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/15 text-amber-200 text-xs space-y-2">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Microphone Sandbox Blocked</span>
                  </div>
                  <p className="leading-relaxed opacity-90">
                    Web Speech API is blocked inside cross-origin iframe previews by browsers. Click <strong className="text-white underline font-semibold cursor-pointer" onClick={() => window.open(window.location.href, '_blank')}>"Open in New Tab"</strong> below to instantly unlock standard speech microphone capabilities, or use the manual text simulator below!
                  </p>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 italic text-center mt-2">
                  Tip: Press <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded font-sans text-[10px] text-slate-400">Space</kbd> to unlock microphone toggle.
                </div>
              )}
              <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-4 relative">
                <button
                  onClick={toggleListening}
                  title="Toggle Microphone (Space)"
                  className={`relative z-10 group shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isListening 
                      ? 'bg-red-500/10 text-red-500 border border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]' 
                      : 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-500/50'
                  }`}
                >
                  <div className="absolute inset-0 rounded-full bg-current opacity-20 group-hover:opacity-30 blur-xl transition-opacity"></div>
                  {isListening ? <MicOff className="w-8 h-8 sm:w-10 sm:h-10" /> : <Mic className="w-8 h-8 sm:w-10 sm:h-10" />}
                  {isListening && (
                    <span className="absolute inset-0 rounded-full border border-red-500 animate-ping opacity-20" />
                  )}
                </button>

                <div className="w-full sm:flex-1 max-w-xl relative">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const target = e.target as typeof e.target & {
                      textInput: { value: string }
                    };
                    const text = target.textInput.value.trim();
                    if (text) {
                       const newId = Date.now().toString();
                       let detectedLangName = '';
                       try {
                         const detectRes = lngDetector.detect(text, 1);
                         detectedLangName = (!inputLanguage && detectRes.length > 0) 
                           ? detectRes[0][0].charAt(0).toUpperCase() + detectRes[0][0].slice(1)
                           : '';
                       } catch(e) {}
                         
                       setTranscripts(prev => [...prev, { id: newId, originalText: text, translatedText: '', isFinal: false, timestamp: Date.now(), detectedLanguage: detectedLangName }]);
                       setTimeout(() => handleTranslate(newId, text, targetLanguage, detectedLangName), 50);
                       target.textInput.value = '';
                    }
                  }}>
                    <input 
                      name="textInput"
                      type="text"
                      className="w-full bg-[#111424] border border-white/10 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 placeholder-slate-500 transition-all text-sm sm:text-base"
                      placeholder="Type manually if microphone fails..."
                      autoComplete="off"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hidden sm:block">Press Enter</div>
                  </form>
                </div>
              </div>
            </div>

            {/* Visualizer */}
            <div className="shrink-0">
               <AudioVisualizer isActive={isListening || isSpeaking} />
            </div>
          </div>

          {/* Right Column: Output & Translation */}
          <div className="w-full lg:w-1/2 flex flex-col gap-6">
            <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col relative overflow-hidden backdrop-blur-md">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-4 gap-4">
                <h2 className="text-sm font-medium tracking-wide text-slate-400 uppercase flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Live Translation
                </h2>
                
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex gap-2 mr-2">
                    <button onClick={handleTranslateAll} title="Translate All (Ctrl+T)" className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-medium rounded-lg transition-colors border border-cyan-500/20">
                      <Wand2 className="w-3.5 h-3.5" /> Translate All
                    </button>
                    <button onClick={handleSpeakTranslated} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-medium rounded-lg transition-colors border border-indigo-500/20">
                      <Volume2 className="w-3.5 h-3.5" /> Speak All
                    </button>
                  </div>

                  <div className="flex items-center gap-2 bg-black/30 p-1 rounded-xl border border-white/5">
                    <label className="text-xs text-slate-400 flex items-center gap-1.5 cursor-pointer px-2">
                      <input type="checkbox" checked={autoTranslate} onChange={(e) => setAutoTranslate(e.target.checked)} className="accent-cyan-500 cursor-pointer" />
                      Auto-Translate
                    </label>
                    <select 
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="bg-black/80 border border-white/10 rounded-lg px-2 py-1 text-xs text-cyan-400 focus:outline-none focus:border-cyan-500 max-w-[110px] truncate"
                    >
                      {languages.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                <AnimatePresence initial={false}>
                  {transcripts.map((t) => (
                    <motion.div 
                      key={`tr-${t.id}`} 
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="group flex flex-col gap-2 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                    >
                       <div className="text-[11px] font-semibold text-slate-500 tracking-wide flex items-center justify-between border-b border-white/5 pb-1 mb-2">
                         <span className="truncate max-w-[80%]">Original: "{t.originalText}"</span>
                         <span className="text-[10px] font-mono text-slate-600 shrink-0">
                           {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                         </span>
                       </div>

                       {t.translations && t.translations.length > 0 ? (
                         <div className="space-y-3">
                           {t.translations.map((trans, index) => (
                             <div key={index} className="flex items-start justify-between bg-indigo-950/20 p-3 rounded-lg border border-indigo-500/10 group/transitem">
                               <div className="space-y-1">
                                 <span className="inline-block text-[10px] font-bold tracking-wider text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded uppercase">
                                   {getLangLabel(trans.language)}
                                 </span>
                                 <p className="text-lg font-medium tracking-tight text-white leading-relaxed">
                                   {trans.text}
                                 </p>
                               </div>
                               <button 
                                 onClick={(e) => { e.stopPropagation(); speak(trans.text, trans.language, false, 'translated'); }}
                                 className="opacity-0 group-hover:opacity-100 group-hover/transitem:opacity-100 p-2 bg-white/5 border border-white/5 rounded-md hover:bg-cyan-500/20 hover:text-cyan-400 transition-all shrink-0 ml-2"
                                 title={`Dictate ${getLangLabel(trans.language)} translation`}
                                >
                                 <Volume2 className="w-4 h-4" />
                               </button>
                             </div>
                           ))}
                         </div>
                       ) : (
                         <div className="flex items-start justify-between">
                           <div className="flex flex-col gap-1 w-full">
                             <p className="text-xl font-medium tracking-tight text-white leading-relaxed">
                               {t.translatedText ? t.translatedText : (
                                  <span className="flex items-center space-x-2 text-slate-500">
                                    <span className="text-sm italic">Pending translation...</span>
                                  </span>
                               )}
                             </p>
                           </div>
                           {t.translatedText && (
                             <button 
                               onClick={(e) => { e.stopPropagation(); speak(t.translatedText, targetLanguage, false, 'translated'); }}
                               className="opacity-0 group-hover:opacity-100 p-2 bg-white/10 rounded-md hover:bg-cyan-500/20 hover:text-cyan-400 transition-all shrink-0 ml-2"
                               title="Dictate Translation"
                             >
                               <Volume2 className="w-4 h-4" />
                             </button>
                           )}
                         </div>
                       )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isProcessing && (
                   <motion.div 
                     initial={{ opacity: 0 }} 
                     animate={{ opacity: 1 }} 
                     className="text-cyan-500/50 italic text-sm animate-pulse flex items-center gap-2"
                   >
                     <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                     Processing context...
                   </motion.div>
                )}
              </div>
            </div>

            {/* AI Voice Engine Controls */}
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 backdrop-blur-md flex flex-col gap-6 shrink-0">
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 w-full space-y-6">
                  <div className="flex items-center justify-between mb-2 border-b border-white/5 pb-4">
                    <h2 className="text-sm font-medium tracking-wide text-slate-400 uppercase flex items-center gap-2">
                      <Speaker className="w-4 h-4" /> Synthesizer Engine
                    </h2>
                    
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-slate-500 flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} className="accent-cyan-500 cursor-pointer" />
                        Auto-Speak
                      </label>
                      
                      {isSpeaking ? (
                        <button onClick={stop} className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium" title="Stop Speaking">
                          <Square className="w-3 h-3" fill="currentColor" /> Stop
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={handleSpeakTranscribed} className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg transition-colors border border-cyan-500/20 flex items-center gap-1.5 text-xs font-medium" title="Play Transcribed">
                            <Play className="w-3 h-3" fill="currentColor" /> Transcribed
                          </button>
                          <button onClick={handleSpeakTranslated} className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors border border-indigo-500/20 flex items-center gap-1.5 text-xs font-medium" title="Play Translated">
                            <Play className="w-3 h-3" fill="currentColor" /> Translated
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {synthesisError ? (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/15 rounded-2xl text-xs text-amber-300 space-y-2">
                      <div className="font-bold flex items-center gap-1.5 text-amber-400">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Speech Output Blocked / Restricted</span>
                      </div>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        The browser or standard frame protection has muted speech output. Clicking "Troubleshoot" or running the application in a new tab will unmute the voices instantly.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button 
                          onClick={resetEngine}
                          className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <Wand2 className="w-3.5 h-3.5" /> Troubleshoot / Wake Audio
                        </button>
                        <button 
                          onClick={() => window.open(window.location.href, '_blank')}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
                        >
                          Open in New Tab ↗
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
                        Web Speech Synthesis may require manual wake or full browser tab access.
                      </span>
                      <div className="flex gap-2 shrink-0">
                        <button 
                          onClick={resetEngine}
                          className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold rounded-md border border-white/5 transition-all text-[10px]"
                        >
                          Troubleshoot / Wake Audio
                        </button>
                        <button 
                          onClick={() => window.open(window.location.href, '_blank')}
                          className="px-2.5 py-1 bg-cyan-500/15 hover:bg-cyan-500/20 text-cyan-400 font-semibold rounded-md border border-cyan-500/10 transition-all text-[10px]"
                        >
                          Open in New Tab ↗
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-3">
                      <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase flex items-center gap-1.5"><Settings2 className="w-3 h-3"/> Voice Output</label>
                      <select 
                        value={selectedVoice?.voiceURI || ''} 
                        onChange={(e) => {
                          const v = voices.find(voice => voice.voiceURI === e.target.value);
                          if (v) setSelectedVoice(v);
                        }}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 outline-none truncate"
                      >
                        {voices.map((v, idx) => (
                          <option key={`${v.voiceURI}-${idx}`} value={v.voiceURI}>{v.name} ({v.lang})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-semibold tracking-wider text-slate-500 uppercase flex items-center gap-1.5"><Sparkles className="w-3 h-3"/> Voice Tone</label>
                      <select 
                        value={activeTone}
                        onChange={(e) => handleToneChange(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-cyan-400 focus:border-cyan-500 outline-none truncate"
                      >
                        {['Standard', 'Friendly', 'Formal', 'Assistant', 'Robotic AI'].map(tone => (
                          <option key={tone} value={tone}>{tone}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-semibold tracking-wider text-slate-500 uppercase">
                        <span>Speed</span>
                        <span className="text-cyan-400">{rate.toFixed(1)}x</span>
                      </div>
                      <input type="range" min="0.5" max="2" step="0.1" value={rate} onChange={(e) => {setRate(parseFloat(e.target.value)); setActiveTone('Custom');}} className="w-full accent-cyan-500" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-semibold tracking-wider text-slate-500 uppercase">
                        <span>Pitch</span>
                        <span className="text-cyan-400">{pitch.toFixed(1)}</span>
                      </div>
                      <input type="range" min="0" max="2" step="0.1" value={pitch} onChange={(e) => {setPitch(parseFloat(e.target.value)); setActiveTone('Custom');}} className="w-full accent-cyan-500" />
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center justify-center">
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-center bg-white/[0.01] border border-white/5 p-5 rounded-3xl relative">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold tracking-wider text-cyan-400 uppercase mb-1">Source AI</span>
                      <RoboAvatar 
                        variant="source"
                        state={
                          (isSpeaking && speakingType === 'original') ? 'speaking' :
                          isListening ? 'listening' : 'idle'
                        } 
                      />
                    </div>
                    
                    <div className="flex flex-row sm:flex-col lg:flex-row items-center justify-center gap-1 opacity-50 select-none">
                      <span className={`w-1.5 h-1.5 rounded-full bg-cyan-400 ${isListening ? 'animate-ping' : ''}`} />
                      <div className="h-[2px] w-8 bg-gradient-to-r from-cyan-500 to-indigo-500 sm:h-8 sm:w-[2px] lg:h-[2px] lg:w-8" />
                      <span className={`w-1.5 h-1.5 rounded-full bg-indigo-400 ${isProcessing ? 'animate-bounce' : ''}`} />
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold tracking-wider text-indigo-400 uppercase mb-1">Translator AI</span>
                      <RoboAvatar 
                        variant="target"
                        state={
                          (isSpeaking && speakingType === 'translated') ? 'speaking' :
                          isProcessing ? 'processing' : 'idle'
                        } 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0f111a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-cyan-400" /> Session History
                </h3>
                <button onClick={() => setShowHistory(false)} className="p-1 text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
                {pastSessions.length === 0 ? (
                  <p className="text-center text-slate-500 py-8 text-sm">No saved sessions yet.</p>
                ) : (
                  pastSessions.map(session => (
                    <div 
                      key={session.id} 
                      onClick={() => loadSession(session)}
                      className="group p-4 bg-white/[0.02] border border-white/5 hover:border-cyan-500/50 rounded-xl cursor-pointer transition-all flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <h4 className="text-slate-200 font-medium line-clamp-1">{session.title}</h4>
                        <button 
                          onClick={(e) => deleteSession(session.id, e)}
                          className="text-slate-500 hover:text-red-400 transition-colors shrink-0 p-1 rounded hover:bg-white/5 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>{new Date(session.timestamp).toLocaleString()}</span>
                        <span className="bg-white/5 px-2 py-0.5 rounded-md">{session.transcripts.length} exchanges</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
