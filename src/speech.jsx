import { useEffect, useRef, useState } from 'react';
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
  const currentUtterance = useRef(null);
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    if (!supported) return undefined;
    // Chrome loads voices asynchronously; touching getVoices() kicks that off.
    window.speechSynthesis.getVoices();
    return () => window.speechSynthesis.cancel();
  }, [supported]);

  function start(key, text) {
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickEnglishVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-US';
    utterance.rate = 1;
    // Lượt bị cancel vẫn bắn onerror sau khi lượt mới đã chạy, nên phải so đúng lượt đang phát.
    const clear = () => {
      if (currentUtterance.current === utterance) setSpeakingKey(null);
    };
    utterance.onend = clear;
    utterance.onerror = clear;
    currentUtterance.current = utterance;
    setSpeakingKey(key);
    window.speechSynthesis.speak(utterance);
  }

  function toggle(key, text) {
    if (!supported) return;
    window.speechSynthesis.cancel();
    if (speakingKey === key || !text) {
      setSpeakingKey(null);
      return;
    }
    start(key, text);
  }

  // Khác toggle: bấm lại đúng mục đang đọc thì đọc lại từ đầu chứ không dừng.
  function speak(key, text) {
    if (!supported || !text) return;
    window.speechSynthesis.cancel();
    start(key, text);
  }

  return { supported, speakingKey, toggle, speak };
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

