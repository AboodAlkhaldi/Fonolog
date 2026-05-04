export interface EvalResult {
  correct:    boolean
  transcript: string
  similarity: number
}

export interface ISpeechRecognizer {
  evaluate(audioUri: string, expectedWord: string): Promise<EvalResult>
}
