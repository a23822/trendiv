/**
 * Utility Helper Functions
 */

export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function isYoutubeLink(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname.includes('youtube.com') ||
      urlObj.hostname.includes('youtu.be')
    );
  } catch {
    return false;
  }
}

export function sanitizeText(text: string, maxLength: number): string {
  return text.replace(/\s+/g, ' ').trim().substring(0, maxLength);
}

export function extractJSON(text: string): string {
  // Remove markdown code blocks
  let cleaned = text.replace(/```json|```/g, '').trim();

  // Extract JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return cleaned;
}

export function parseGeminiResponse<T>(responseText: string): T {
  const jsonText = extractJSON(responseText);
  return JSON.parse(jsonText) as T;
}
