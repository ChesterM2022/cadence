/**
 * Phase education content.
 *
 * Voice: scientific and non-judgmental. Each entry explains the underlying
 * physiology plainly, then adds gently-hedged, NON-prescriptive observations
 * ("many people notice…", never "you should…"). Individual experiences vary
 * enormously, and that is stated rather than treated as abnormal.
 *
 * NOTE: this copy is grounded in mainstream reproductive physiology (the kind
 * described by ACOG, NIH/NICHD, and Mayo Clinic). It is pending a formal
 * accuracy + citation review before public launch — see the repo's open items.
 * It is educational content, not medical advice, and not a contraceptive method.
 */

import type { Phase } from './phase';

export interface PhaseContent {
  label: string;
  tagline: string;
  /** What is physically happening — the hormones and the body. */
  whatsHappening: string;
  /** Gently-hedged, non-prescriptive notes on common experiences. */
  commonlyNoticed: string;
  /** How experiences commonly shift from the start of the phase to its end. */
  withinPhase: string;
  /** A short, reassuring, non-judgmental reminder. */
  reminder: string;
}

export const PHASE_CONTENT: Record<Phase, PhaseContent> = {
  menstrual: {
    label: 'Menstrual phase',
    tagline: 'Your period. A new cycle begins.',
    whatsHappening:
      'The lining your body built up over the last cycle is shed as your period. Estrogen and progesterone are at their lowest of the whole cycle. By convention, the first day of bleeding is counted as day 1 of a new cycle.',
    commonlyNoticed:
      'With hormones low, many people feel lower energy or a need for more rest, and some have cramps as the uterus contracts. Others feel a sense of relief or a clear reset. All of these are common — there is no single “right” way to feel.',
    withinPhase:
      'The first day or two often bring the heaviest flow and the strongest cramps, as the lining sheds most actively. Toward the end, bleeding usually lightens and many people feel their energy beginning to return.',
    reminder:
      'Rest if you need it. Period pain is common, but pain severe enough to disrupt your life is worth discussing with a clinician.',
  },
  follicular: {
    label: 'Follicular phase',
    tagline: 'Rebuilding and rising.',
    whatsHappening:
      'The pituitary releases FSH (follicle-stimulating hormone), which prompts follicles in the ovaries to mature. As they develop, they produce more estrogen, which begins rebuilding the uterine lining. This phase runs from the end of your period up to ovulation.',
    commonlyNoticed:
      'As estrogen climbs, many people notice steadier or rising energy, clearer focus, or a lift in mood through this stretch. This varies from person to person and from cycle to cycle.',
    withinPhase:
      'Early on, just after your period, energy is often still rebuilding. As the phase goes on and estrogen rises toward ovulation, many people notice climbing energy, sharper focus, and a lift in mood or libido.',
    reminder:
      'The follicular phase is the most variable in length between people — a longer or shorter one is not by itself a problem.',
  },
  ovulatory: {
    label: 'Ovulatory phase',
    tagline: 'An egg is released.',
    whatsHappening:
      'A surge in LH (luteinizing hormone) triggers the most mature follicle to release an egg — ovulation. Estrogen peaks around now. The fertile window spans roughly the few days before ovulation plus ovulation day, because sperm can survive several days.',
    commonlyNoticed:
      'Around ovulation, some people notice a change in cervical fluid, a mild one-sided twinge, or feeling especially energetic or social. Many notice nothing at all, which is equally normal.',
    withinPhase:
      'This is a short window. Near the peak, some notice more energy, higher libido, a change in cervical fluid, or a brief one-sided twinge. As it passes, those signs settle and the body moves into the luteal phase.',
    reminder:
      'Cadence estimates this window from your dates — it is an estimate, not a fertility test, and should not be relied on to prevent or plan pregnancy.',
  },
  luteal: {
    label: 'Luteal phase',
    tagline: 'The wind-down before your next period.',
    whatsHappening:
      'After releasing the egg, the follicle becomes the corpus luteum and produces progesterone, which maintains the uterine lining. If no pregnancy occurs, the corpus luteum breaks down, progesterone and estrogen fall, and that drop brings on your next period. This phase is usually the most consistent in length, around 12–14 days.',
    commonlyNoticed:
      'As hormones fall in the later luteal phase, many people notice premenstrual changes — shifts in mood, appetite, sleep, bloating, or tender breasts. The range of normal here is wide; some notice a lot and some very little.',
    withinPhase:
      'The early luteal phase is often one of the steadiest stretches of the whole cycle, as progesterone rises. In the last few days before your period — the late luteal phase — progesterone and estrogen both fall, and that is when premenstrual changes most commonly appear. If they do, they usually ease once your period begins. In other words, “PMS” tends to be a late-luteal experience, not the whole phase.',
    reminder:
      'If premenstrual symptoms are severe enough to disrupt your life or relationships each cycle, that is worth raising with a clinician — it is common, and it is treatable.',
  },
};

export const MEDICAL_DISCLAIMER =
  'Cadence is an educational tool, not medical advice. Its phase and period estimates are calculated from your own logged dates and can be wrong, especially with irregular cycles. It is not a contraceptive method and cannot diagnose any condition. For anything concerning about your body, talk to a qualified clinician.';
