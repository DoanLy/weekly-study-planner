/* Phiên âm IPA (giọng Mỹ, khớp với giọng en-US của nút loa) tra từ từ điển CMU.
   Từ điển nặng ~4.7 MB nên chỉ tải khi mở một bài vlog (chunk riêng của Vite). */

const VOWELS = {
  AA: 'ɑː',
  AE: 'æ',
  AO: 'ɔː',
  AW: 'aʊ',
  AY: 'aɪ',
  EH: 'e',
  EY: 'eɪ',
  IH: 'ɪ',
  OW: 'oʊ',
  OY: 'ɔɪ',
  UH: 'ʊ',
};

const CONSONANTS = {
  B: 'b',
  CH: 'tʃ',
  D: 'd',
  DH: 'ð',
  F: 'f',
  G: 'ɡ',
  HH: 'h',
  JH: 'dʒ',
  K: 'k',
  L: 'l',
  M: 'm',
  N: 'n',
  NG: 'ŋ',
  P: 'p',
  R: 'r',
  S: 's',
  SH: 'ʃ',
  T: 't',
  TH: 'θ',
  V: 'v',
  W: 'w',
  Y: 'j',
  Z: 'z',
  ZH: 'ʒ',
};

/* Các cụm phụ âm được phép đứng đầu âm tiết — để đặt dấu nhấn đúng chỗ:
   "pretty" là /ˈprɪti/ chứ không phải /pˈrɪti/. */
const LEGAL_ONSETS = new Set(
  [
    'B L', 'B R', 'B Y', 'D R', 'D Y', 'D W', 'F L', 'F R', 'F Y', 'G L', 'G R', 'G W', 'G Y',
    'HH W', 'HH Y', 'K L', 'K R', 'K W', 'K Y', 'M Y', 'N Y', 'P L', 'P R', 'P Y', 'S F', 'S K',
    'S L', 'S M', 'S N', 'S P', 'S T', 'S W', 'S K L', 'S K R', 'S K W', 'S K Y', 'S M Y',
    'S P L', 'S P R', 'S P Y', 'S T R', 'SH R', 'T R', 'T W', 'TH R', 'TH W', 'V Y',
  ],
);

function vowelToIpa(base, stress) {
  const stressed = stress !== '0';
  if (base === 'AH') return stressed ? 'ʌ' : 'ə';
  if (base === 'ER') return stressed ? 'ɝː' : 'ɚ';
  if (base === 'IY') return stressed ? 'iː' : 'i';
  if (base === 'UW') return stressed ? 'uː' : 'u';
  return VOWELS[base] || '';
}

function onsetLength(consonants) {
  for (let length = consonants.length; length > 1; length -= 1) {
    if (LEGAL_ONSETS.has(consonants.slice(-length).join(' '))) return length;
  }
  return consonants.length && consonants.at(-1) !== 'NG' ? 1 : 0;
}

export function arpabetToIpa(arpabet) {
  const phones = arpabet.split(' ');
  const vowelCount = phones.filter((phone) => /\d$/.test(phone)).length;
  const parts = [];
  let pending = [];

  phones.forEach((phone) => {
    const match = phone.match(/^([A-Z]+)(\d)$/);
    if (!match) {
      pending.push(phone);
      return;
    }
    const [, base, stress] = match;
    const onset = parts.length === 0 ? pending.length : onsetLength(pending);
    const coda = pending.slice(0, pending.length - onset);
    const start = pending.slice(pending.length - onset);
    parts.push(coda.map((c) => CONSONANTS[c]).join(''));
    // Từ một âm tiết không cần dấu nhấn, giống cách từ điển Cambridge ghi.
    if (vowelCount > 1 && stress === '1') parts.push('ˈ');
    if (vowelCount > 1 && stress === '2') parts.push('ˌ');
    parts.push(start.map((c) => CONSONANTS[c]).join(''), vowelToIpa(base, stress));
    pending = [];
  });
  parts.push(pending.map((c) => CONSONANTS[c]).join(''));
  return parts.join('');
}

let dictionaryPromise = null;

export function loadIpaDictionary() {
  if (!dictionaryPromise) {
    dictionaryPromise = import('cmu-pronouncing-dictionary')
      .then((module) => module.dictionary)
      .catch((error) => {
        dictionaryPromise = null; // Cho phép thử lại ở lần mở sau (ví dụ rớt mạng).
        throw error;
      });
  }
  return dictionaryPromise;
}

function lookupWord(dictionary, word) {
  const entry = Object.hasOwn(dictionary, word) ? dictionary[word] : null;
  return entry ? arpabetToIpa(entry) : '';
}

/* Tách câu thành từng từ kèm phiên âm. Từ không có trong từ điển → ipa rỗng. */
export function toIpaTokens(sentence, dictionary) {
  return sentence
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => {
      const core = text
        .toLowerCase()
        .replace(/[’‘]/g, "'")
        .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '')
        .replace(/^'+|'+$/g, '');
      if (!core || !dictionary) return { text, ipa: '', isWord: Boolean(core) };
      const ipa =
        lookupWord(dictionary, core) ||
        core
          .split(/[^a-z0-9']+/)
          .map((part) => lookupWord(dictionary, part))
          .filter(Boolean)
          .join('-');
      return { text, ipa, isWord: true };
    });
}
