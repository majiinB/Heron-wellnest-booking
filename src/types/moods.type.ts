export type MoodClassification = | "in crisis" | "struggling" | "thriving" | "excelling";

export type Mood = 
| "depressed" | "sad" | "exhausted" | "hopeless"
| "anxious" | "angry" | "stressed" | "restless"
| "calm" | "relaxed" | "peaceful" | "content"
| "happy" | "energized" | "excited" | "motivated";

/**
 * A mapping between mood classifications and their corresponding moods.
 *
 * Each key represents a `MoodClassification` (such as "in crisis", "struggling", "thriving", or "excelling"),
 * and maps to an array of `Mood` values that fall under that classification.
 *
 * @example
 * MoodMap["thriving"]; // ["calm", "relaxed", "peaceful", "content"]
 */
export const MoodMap: Record<MoodClassification, Mood[]> = {
  "in crisis": ["depressed", "sad", "exhausted", "hopeless"],
  "struggling": ["anxious", "angry", "stressed", "restless"],
  "thriving": ["calm", "relaxed", "peaceful", "content"],
  "excelling": ["happy", "energized", "excited", "motivated"],
};