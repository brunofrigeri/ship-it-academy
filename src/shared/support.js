import { SITE } from '../site.config.js';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// A top-bar button and a softer inline mention, both pointing at SITE.supportUrl.
export const coffeeButton = (cls = '') => `<a class="coffee ${cls}" href="${esc(SITE.supportUrl)}" target="_blank" rel="noopener noreferrer" title="${esc(SITE.supportLabel)}"><span aria-hidden="true">☕</span><span class="coffee-l">${esc(SITE.supportLabel)}</span></a>`;
export const coffeeNote = text => `<p class="coffee-note">${esc(text)} <a href="${esc(SITE.supportUrl)}" target="_blank" rel="noopener noreferrer">☕ ${esc(SITE.supportLabel)}</a></p>`;
