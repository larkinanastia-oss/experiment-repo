export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'night' | 'all_day'
export type Difficulty = 'Easy' | 'Medium'

export interface Challenge {
  id: string
  title: string
  icon: string
  instruction: string
  targetMeal: Meal
  difficulty: Difficulty
  /** Share of the target spike removed on a "done" day (0.3 = 30%). Drives the mock data. */
  expectedSpikeReduction: number
  reminderTime: string
  reminderText: string
  /** One line for the "Next week" teaser card. */
  teaser: string
  /** Used in copy like "On walk days your dinner spike is 28% lower". */
  dayLabel: string
}

export const CHALLENGES: Challenge[] = [
  {
    id: 'walk-dinner-10',
    title: 'Walk 10 min after dinner',
    icon: '🚶',
    instruction: 'Take an easy 10-minute walk within 30 minutes after dinner. Around the block is enough.',
    targetMeal: 'dinner',
    difficulty: 'Easy',
    expectedSpikeReduction: 0.3,
    reminderTime: '20:00',
    reminderText: 'Time for your 10-min walk after dinner 🚶',
    teaser: 'A short evening walk to flatten your dinner spike.',
    dayLabel: 'walk days',
  },
  {
    id: 'veggies-first-dinner',
    title: 'Vegetables first at dinner',
    icon: '🥗',
    instruction: 'Eat your salad or vegetables first, then the rest of the plate.',
    targetMeal: 'dinner',
    difficulty: 'Easy',
    expectedSpikeReduction: 0.2,
    reminderTime: '18:45',
    reminderText: 'Dinner time — start with the veggies 🥗',
    teaser: 'Change the order, not the food.',
    dayLabel: 'veggies-first days',
  },
  {
    id: 'protein-first-lunch',
    title: 'Eat protein before carbs at lunch',
    icon: '🍗',
    instruction: 'Start lunch with the protein part (meat, fish, eggs, tofu), then eat the bread, rice or pasta.',
    targetMeal: 'lunch',
    difficulty: 'Easy',
    expectedSpikeReduction: 0.2,
    reminderTime: '12:45',
    reminderText: 'Lunch soon — protein first, carbs after 🍗',
    teaser: 'Protein first, carbs second — see what your lunch does.',
    dayLabel: 'protein-first days',
  },
  {
    id: 'savoury-breakfast',
    title: 'Swap sweet breakfast for eggs or yogurt',
    icon: '🍳',
    instruction: 'Replace cereal, pastries or sweet porridge with eggs or plain yogurt with nuts.',
    targetMeal: 'breakfast',
    difficulty: 'Medium',
    expectedSpikeReduction: 0.35,
    reminderTime: '07:45',
    reminderText: 'Good morning! Eggs or yogurt today? 🍳',
    teaser: 'A calmer morning starts with a savoury breakfast.',
    dayLabel: 'savoury-breakfast days',
  },
  {
    id: 'no-sugary-drinks',
    title: 'No sugary drinks for 7 days',
    icon: '🥤',
    instruction: 'Skip soda, juice and sweet coffee drinks. Water, sparkling water and plain coffee or tea are fine.',
    targetMeal: 'all_day',
    difficulty: 'Medium',
    expectedSpikeReduction: 0.15,
    reminderTime: '12:00',
    reminderText: 'Reminder: water or sparkling water today 💧',
    teaser: 'One week without sweet drinks.',
    dayLabel: 'no-sugar days',
  },
  {
    id: 'early-dinner',
    title: 'Finish dinner 3 hours before bed',
    icon: '🌙',
    instruction: 'Finish your last meal at least 3 hours before you go to sleep. We track your morning glucose.',
    targetMeal: 'night',
    difficulty: 'Medium',
    expectedSpikeReduction: 0.1,
    reminderTime: '18:00',
    reminderText: 'Plan an early dinner tonight 🌙',
    teaser: 'An earlier dinner for better mornings.',
    dayLabel: 'early-dinner days',
  },
  {
    id: 'sleep-7h',
    title: 'Sleep 7+ hours',
    icon: '😴',
    instruction: 'Go to bed early enough to get 7 or more hours of sleep. We track your morning glucose.',
    targetMeal: 'night',
    difficulty: 'Medium',
    expectedSpikeReduction: 0.1,
    reminderTime: '22:30',
    reminderText: 'Wind down — 7 hours of sleep tonight 😴',
    teaser: 'Sleep is part of your glucose story too.',
    dayLabel: '7-hour nights',
  },
]

/**
 * Weekly schedule, the same for every user (like a game event).
 * Week 1 starts Monday 16 Nov 2026. After the last week the schedule repeats.
 */
export const SCHEDULE: string[] = [
  'walk-dinner-10',
  'veggies-first-dinner',
  'protein-first-lunch',
  'savoury-breakfast',
  'no-sugary-drinks',
  'early-dinner',
  'sleep-7h',
]

export function byId(id: string): Challenge {
  const c = CHALLENGES.find((x) => x.id === id)
  if (!c) throw new Error(`Unknown challenge ${id}`)
  return c
}

export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  night: 'morning glucose',
  all_day: 'after-meal',
}

/** Adjective for result copy: "Your evening spikes were 31% lower". */
export const MEAL_ADJ: Record<Meal, string> = {
  breakfast: 'morning',
  lunch: 'lunchtime',
  dinner: 'evening',
  night: 'morning',
  all_day: 'after-meal',
}

export const TARGET_LABEL: Record<Meal, string> = {
  breakfast: 'Breakfast · morning',
  lunch: 'Lunch · midday',
  dinner: 'Dinner · evening',
  night: 'Night · morning glucose',
  all_day: 'All day',
}
