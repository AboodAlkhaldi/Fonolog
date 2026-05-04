// Utility functions shared by all generators
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n)
}

export function makeOptions(correct: string, pool: string[]): string[] {
  const distractors = shuffle(pool.filter(p => p !== correct)).slice(0, 3)
  return shuffle([correct, ...distractors])
}

export function qid(prefix: string, index: number): string {
  return `${prefix}_${index}_${Date.now()}`
}