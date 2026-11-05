import { useEffect, useState } from 'react';
import { Square, Volume2 } from 'lucide-react';

function pickEnglishVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  return (
    voices.find((v) => v.lang === 'en-US' && /natural|online|google/i.test(v.name)) ||
    voices.find((v) => v.lang === 'en-US') ||
    voices.find((v) => v.lang?.startsWith('en')) ||
    null
  );
}

export function useSpeech() {
  const [speakingKey, setSpeakingKey] = useState(null);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    if (!supported) return undefined;
    // Chrome loads voices asynchronously; touching getVoices() kicks that off.
    window.speechSynthesis.getVoices();
    return () => window.speechSynthesis.cancel();
  }, [supported]);

  function toggle(key, text) {
    if (!supported) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    if (speakingKey === key || !text) {
      setSpeakingKey(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickEnglishVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-US';
    utterance.rate = 1;
    const clear = () => setSpeakingKey((current) => (current === key ? null : current));
    utterance.onend = clear;
    utterance.onerror = clear;
    setSpeakingKey(key);
    synth.speak(utterance);
  }

  return { supported, speakingKey, toggle };
}

export function SpeakButton({ speech, speechKey, getText, label, className = 'h-7 w-7' }) {
  if (!speech.supported) return null;
  const active = speech.speakingKey === speechKey;
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => speech.toggle(speechKey, getText())}
      title={active ? 'Dừng đọc' : label}
      aria-label={active ? 'Dừng đọc' : label}
      className={`icon-btn ${className} ${active ? 'icon-btn-on' : ''}`}
    >
      {active ? <Square size={12} fill="currentColor" /> : <Volume2 size={14} />}
    </button>
  );
}

