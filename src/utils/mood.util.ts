import { AppError } from "../types/appError.type.js";
import { MoodMap, type Mood, type MoodClassification } from "../types/moods.type.js";

export function isValidMood(mood: string): mood is Mood {
  return Object.values(MoodMap).flat().includes(mood as Mood);
}

export function getMoodClassification(mood: Mood): MoodClassification {
  for (const [classification, moods] of Object.entries(MoodMap)) {
    if (moods.includes(mood)) {
      return classification as MoodClassification;
    }
  }
  throw new AppError(
    400,
    "INVALID_MOOD",
    `The mood '${mood}' is not recognized.`,
    true
  )
}
