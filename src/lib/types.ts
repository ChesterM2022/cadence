/** The focused set of things a woman can log for a single day. */

export type Flow = 'spotting' | 'light' | 'medium' | 'heavy';
export type Energy = 'low' | 'medium' | 'high';
export type Cramps = 'none' | 'mild' | 'moderate' | 'strong';
export type Sleep = 'poor' | 'ok' | 'good';

export interface DayEntry {
  date: string; // "YYYY-MM-DD"
  flow?: Flow;
  energy?: Energy;
  mood?: string[]; // small set of chips, non-judgmental
  cramps?: Cramps;
  sleep?: Sleep;
  note?: string;
}

/** Flow levels that count as menstrual bleeding for cycle detection. */
export const BLEEDING_FLOWS: Flow[] = ['light', 'medium', 'heavy'];

export const MOOD_OPTIONS = [
  'calm',
  'happy',
  'sensitive',
  'low',
  'irritable',
  'anxious',
  'energized',
] as const;

/** True if a day's flow counts as bleeding (spotting does not start a period). */
export function isBleeding(entry: Pick<DayEntry, 'flow'>): boolean {
  return entry.flow !== undefined && BLEEDING_FLOWS.includes(entry.flow);
}

/** True if the day has anything logged at all. */
export function hasAnyData(e: DayEntry): boolean {
  return Boolean(e.flow || e.energy || e.cramps || e.sleep || e.note || (e.mood && e.mood.length));
}
