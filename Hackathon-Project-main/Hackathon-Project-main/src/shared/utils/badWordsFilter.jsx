// badWordsFilter.jsx
// Abordare: normalizare leet speak → verificare față de cuvinte de bază
// Aceasta acoperă automat TOATE variantele (pul4, pvl@, pu14, etc.)

// ─── 1. NORMALIZARE LEET SPEAK ────────────────────────────────────────────────
const normalizeLeet = (text) => {
  return text
    .toLowerCase()
    // Substituții de litere
    .replace(/4|@|â|ä/g, 'a')
    .replace(/1|!|\|/g, 'i')
    .replace(/0/g, 'o')
    .replace(/3/g, 'e')
    .replace(/5|\$/g, 's')
    .replace(/7|\+/g, 't')
    .replace(/v/g, 'u')        // în română, 'v' înlocuiește des 'u' (puvla → puula)
    .replace(/q/g, 'c')        // draqu → dracu
    .replace(/k/g, 'c')        // kakat → cacat
    .replace(/ph/g, 'f')       // phut → fut
    .replace(/tz|ț|ţ/g, 't')  // tzigan, țigan
    .replace(/â|ă/g, 'a')
    .replace(/î/g, 'i')
    // Elimină caractere de separare folosite să păcălească filtrul (p-u-l-a, p.u.l.a)
    .replace(/[\s\-_.,'*]+/g, '');
};

// ─── 2. LISTA DE CUVINTE DE BAZĂ (fără variante leet) ────────────────────────
// După normalizare, toate variantele se reduc la aceste forme.
const BAD_WORDS_BASE = [
  // Injurii sexuale
  'pula', 'pizda', 'muie', 'fut', 'fute', 'futut', 'fututa',
  'coaie', 'coae', 'curva', 'curv',

  // Insulte generale
  'prost', 'idiot', 'dracu', 'dracului',
  'cacat', 'caca',
  'tarfa', 'javra',
  'retardat', 'retard',
  'handicapat', 'handicap',
  'dobitoc',
  'tampit',
  'nenorocit',
  'sugi',
  'bulangiu',

  // Discriminatori / Slurs
  'nazist', 'nazi',
  'tigan',
  'jidan',
  'poponar',
  'homalau',
];

// ─── 3. VERIFICARE PRINCIPALĂ (normalizată + word boundary) ──────────────────
export const containsBadWord = (text) => {
  if (!text || typeof text !== 'string') return false;

  const normalized = normalizeLeet(text);

  return BAD_WORDS_BASE.some(word => {
    // Verifică în textul normalizat (acoperă leet speak și separatoare)
    if (normalized.includes(word)) return true;

    // Verifică și în textul original normalizat cu boundary de cuvânt
    // (pentru a prinde cuvinte întregi, nu subșiruri — ex: "document" să nu conțină "doc")
    const regex = new RegExp(`(?<![a-z])${word}(?![a-z])`, 'i');
    return regex.test(normalized);
  });
};

// ─── 4. CENZURARE ─────────────────────────────────────────────────────────────
export const censorText = (text) => {
  if (!text || typeof text !== 'string') return text;

  let censored = text;

  BAD_WORDS_BASE.forEach(word => {
    // Construiește regex care acceptă separatoare între litere (p-u-l-a, p.u.l.a)
    const lettersWithSeparators = word
      .split('')
      .map(ch => `${ch}[\\s\\-_.,'*]*`)
      .join('');
    const regex = new RegExp(lettersWithSeparators, 'gi');
    censored = censored.replace(regex, (match) => '*'.repeat(match.length));
  });

  return censored;
};

// ─── 5. COMPATIBILITATE CU CODUL EXISTENT ────────────────────────────────────
// Report.jsx importă containsBadWordRegex — păstrăm alias-ul.
export const containsBadWordRegex = containsBadWord;
export const containsBadWordStatic = containsBadWord;

// Export listă bază (utilă pentru debugging / teste)
export const BAD_WORDS = BAD_WORDS_BASE;