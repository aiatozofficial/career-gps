/**
 * resumeService.js
 * Frontend API client for PathForge merged features.
 */

// Helper to determine the API base URL.
// The Express server is usually running on PORT 5000 in development.
const API_BASE = "";

/**
 * Upload and analyze a PDF resume against a student's profile.
 * @param {File} file - PDF file object
 * @param {Object} profile - Student profile data
 * @returns {Promise<Object>} - The Gemini analysis results
 */
export async function uploadResume(file, profile) {
  const formData = new FormData();
  formData.append("resume", file);
  formData.append("profile", JSON.stringify(profile));

  const response = await fetch(`${API_BASE}/api/analyze-resume`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to analyze resume.");
  }

  return response.json();
}

/**
 * Fetch real-time job market intelligence.
 * @param {string} jobTitle - The target career role
 * @param {string} field - The study field/discipline
 * @param {string} [location] - Location query (optional)
 * @returns {Promise<Object>} - The job market reports
 */
export async function fetchMarketIntel(jobTitle, field, location = "") {
  const response = await fetch(`${API_BASE}/api/market-intelligence`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ jobTitle, field, location }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to fetch market intelligence.");
  }

  return response.json();
}

/**
 * Send a chat message to the context-aware career advisor bot.
 * @param {Array<Object>} messages - Full chat history array
 * @param {Object} profile - Student profile context
 * @param {Object} [roadmap] - Roadmap context (optional)
 * @param {Object} [resumeAnalysis] - Resume analysis context (optional)
 * @returns {Promise<Object>} - Gemini chat response and suggestions
 */
export async function sendChatMessage(messages, profile, roadmap = null, resumeAnalysis = null) {
  const response = await fetch(`${API_BASE}/api/career-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages, profile, roadmap, resumeAnalysis }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to send message to advisor.");
  }

  return response.json();
}
