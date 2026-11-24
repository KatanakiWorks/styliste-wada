// Pinterest's API cannot search public pins, so the app opens Pinterest's own search;
// in-app inspiration is a Gemini lookbook of the outfit (see lookbook() in gemini.ts).
export const pinterestUrl = (q: string) => `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}`;
