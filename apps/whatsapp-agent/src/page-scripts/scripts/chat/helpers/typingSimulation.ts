/**
 * Typing simulation helper
 * Calculates natural typing delay and triggers "is typing..." indicator
 *
 * @param chatId - Target chat identifier
 * @param messageLength - Length of the message to send
 * @returns Calculated delay in milliseconds
 */

// @ts-nocheck
/* eslint-disable */

export async function simulateTyping(
  chatId: string,
  messageLength: number,
): Promise<number> {
  try {
    // Typing speed: 80 WPM = 400 characters/minute = ~75ms per character
    // Formula: delay = length * 75ms, capped between 500ms and 5000ms
    const baseDelay = messageLength * 75;
    const delay = Math.max(500, Math.min(5000, baseDelay));

    // Show "typing..." indicator for the calculated duration
    await window.WPP.chat.markIsComposing(chatId, delay);

    // Wait for the calculated delay
    await new Promise((resolve) => setTimeout(resolve, delay));

    return delay;
  } catch (error) {
    console.error('Failed to simulate typing:', error);
    // Return minimum delay even if markIsComposing fails
    return 500;
  }
}

/**
 * Sleep utility function
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
