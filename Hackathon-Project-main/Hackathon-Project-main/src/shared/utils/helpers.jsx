// src/shared/utils/helpers.jsx
import { FaRoad, FaLightbulb, FaTrash, FaWater, FaTree, FaTrafficLight, FaBox } from 'react-icons/fa';

// ─── Categorii predefinite ───────────────────────────────────────────────────
// Stocăm referința componentei iconiței (ex: FaRoad), pe care o putem randa ulterior cu <c.icon />
export const CATEGORIES = [
  { id: 'drumuri',     label: 'Gropi / Asfalt',       icon: FaRoad,          color: 'var(--cat-drumuri)',     dept: 'Drumuri' },
  { id: 'iluminat',    label: 'Iluminat stradal',     icon: FaLightbulb,     color: 'var(--cat-iluminat)',    dept: 'Utilități' },
  { id: 'salubritate', label: 'Salubritate / Gunoi',  icon: FaTrash,         color: 'var(--cat-salubritate)', dept: 'Salubritate' },
  { id: 'apa',         label: 'Apă / Canalizare',     icon: FaWater,         color: 'var(--cat-apa)',         dept: 'Apă-Canal' },
  { id: 'spatii',      label: 'Spații verzi',         icon: FaTree,          color: 'var(--cat-spatii)',      dept: 'Parcuri' },
  { id: 'semnalizare', label: 'Semnalizare rutieră',  icon: FaTrafficLight,  color: 'var(--cat-semnalizare)', dept: 'Poliție Locală' },
  { id: 'altele',      label: 'Altele',               icon: FaBox,           color: 'var(--cat-altele)',      dept: null },
];

export const getCategoryById = (id) =>
  CATEGORIES.find(c => c.id === id) ?? CATEGORIES.at(-1);

// ─── Status config ────────────────────────────────────────────────────────────
export const STATUS = {
  NOU:          { label: 'Nou',          color: 'var(--status-nou)',       bg: 'var(--status-nou-bg)' },
  IN_PROCESARE: { label: 'În procesare', color: 'var(--status-procesare)', bg: 'var(--status-procesare-bg)' },
  REZOLVAT:     { label: 'Rezolvat',     color: 'var(--status-rezolvat)',  bg: 'var(--status-rezolvat-bg)' },
};

export const getStatusConfig = (status) =>
  STATUS[status] ?? STATUS.NOU;

// ─── Formatare dată ───────────────────────────────────────────────────────────
export function formatDate(ts) {
  if (!ts) return '—';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString('ro-RO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function timeAgo(ts) {
  if (!ts) return '';
  const date = ts?.toDate ? ts.toDate() : new Date(ts);
  const diff  = Math.floor((Date.now() - date) / 1000);
  if (diff < 60)   return 'acum câteva secunde';
  if (diff < 3600) return `acum ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `acum ${Math.floor(diff / 3600)} ore`;
  return `acum ${Math.floor(diff / 86400)} zile`;
}

// ─── Anti-spam: upvote localStorage ──────────────────────────────────────────
const UPVOTE_KEY = 'upvotedIssues';

export function hasUpvoted(issueId) {
  const list = JSON.parse(localStorage.getItem(UPVOTE_KEY) || '[]');
  return list.includes(issueId);
}

export function markUpvoted(issueId) {
  const list = JSON.parse(localStorage.getItem(UPVOTE_KEY) || '[]');
  if (!list.includes(issueId)) {
    list.push(issueId);
    localStorage.setItem(UPVOTE_KEY, JSON.stringify(list));
  }
}

// ─── Calcul distanță (Haversine, km) ─────────────────────────────────────────
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R  = 6371;
  const dL = ((lat2 - lat1) * Math.PI) / 180;
  const dG = ((lng2 - lng1) * Math.PI) / 180;
  const a  =
    Math.sin(dL / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const DUPLICATE_RADIUS = 0.05; // 50m

// ─── Priorități config ───────────────────────────
export const priorityColor = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'critical': return '#ff4444'; 
    case 'high': return '#ffbb33';    
    case 'medium': return '#00C851';  
    default: return '#33b5e5';        
  }
};

export const priorityLabel = (priority) => {
  return priority ? priority.toUpperCase() : 'NORMAL';
};