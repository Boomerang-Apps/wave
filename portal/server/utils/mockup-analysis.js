/**
 * Mockup Analysis Module (Launch Sequence)
 *
 * Phase 2, Step 2.3: Mockup Analysis Function
 *
 * Analyzes HTML mockup files to extract information about
 * page structure, forms, navigation, and interactive elements.
 */

import { readFile } from 'fs/promises';
import path from 'path';

// ============================================
// Title Extraction
// ============================================

/**
 * Extract page title from HTML content
 * @param {string} html - HTML content
 * @param {string} [filename] - Optional filename for fallback
 * @returns {string} Page title
 */
export function extractPageTitle(html, filename = '') {
  // Try to extract from <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1].trim()) {
    return titleMatch[1].trim();
  }

  // Try to extract from first <h1>
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match && h1Match[1].trim()) {
    return h1Match[1].trim();
  }

  // Fallback: derive from filename
  if (filename) {
    const name = path.basename(filename, path.extname(filename));
    return name
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim();
  }

  return 'Untitled Page';
}

// ============================================
// Form Extraction
// ============================================

/**
 * @typedef {Object} FormInfo
 * @property {string} id - Form ID (or generated)
 * @property {string} action - Form action URL
 * @property {string} method - Form method
 * @property {number} inputCount - Number of input fields
 */

/**
 * Extract forms from HTML content
 * @param {string} html - HTML content
 * @returns {FormInfo[]} Array of form information
 */
export function extractForms(html) {
  const forms = [];
  const formRegex = /<form([^>]*)>([\s\S]*?)<\/form>/gi;

  let match;
  let formIndex = 0;

  while ((match = formRegex.exec(html)) !== null) {
    const attributes = match[1];
    const content = match[2];

    // Extract form attributes
    const idMatch = attributes.match(/id=["']([^"']+)["']/i);
    const actionMatch = attributes.match(/action=["']([^"']+)["']/i);
    const methodMatch = attributes.match(/method=["']([^"']+)["']/i);

    // Count input fields
    const inputCount = (content.match(/<input/gi) || []).length;

    forms.push({
      id: idMatch ? idMatch[1] : `form-${formIndex}`,
      action: actionMatch ? actionMatch[1] : '',
      method: methodMatch ? methodMatch[1].toUpperCase() : 'GET',
      inputCount
    });

    formIndex++;
  }

  return forms;
}

// ============================================
// Navigation Extraction
// ============================================

/**
 * @typedef {Object} NavLink
 * @property {string} href - Link URL
 * @property {string} text - Link text
 */

/**
 * @typedef {Object} NavigationInfo
 * @property {NavLink[]} links - Array of navigation links
 */

/**
 * Extract navigation links from HTML content
 * @param {string} html - HTML content
 * @returns {NavigationInfo} Navigation information
 */
export function extractNavigation(html) {
  const links = [];

  // Look for links in nav, header, and footer elements
  const navRegex = /<(nav|header|footer)[^>]*>([\s\S]*?)<\/\1>/gi;
  let navMatch;

  while ((navMatch = navRegex.exec(html)) !== null) {
    const content = navMatch[2];

    // Extract links from this section
    const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
    let linkMatch;

    while ((linkMatch = linkRegex.exec(content)) !== null) {
      links.push({
        href: linkMatch[1],
        text: linkMatch[2].trim()
      });
    }
  }

  return { links };
}

// ============================================
// Interactive Elements Extraction
// ============================================

/**
 * @typedef {Object} SelectInfo
 * @property {string} name - Select name
 * @property {number} optionCount - Number of options
 */

/**
 * @typedef {Object} InteractiveElements
 * @property {Object[]} buttons - Array of button info
 * @property {SelectInfo[]} selects - Array of select info
 * @property {Object[]} textareas - Array of textarea info
 * @property {Object[]} checkboxes - Array of checkbox info
 * @property {Object[]} radios - Array of radio info
 */

/**
 * Extract interactive elements from HTML content
 * @param {string} html - HTML content
 * @returns {InteractiveElements} Interactive elements info
 */
export function extractInteractiveElements(html) {
  const elements = {
    buttons: [],
    selects: [],
    textareas: [],
    checkboxes: [],
    radios: []
  };

  // Extract buttons
  const buttonRegex = /<button[^>]*>([^<]*)<\/button>/gi;
  let match;
  while ((match = buttonRegex.exec(html)) !== null) {
    elements.buttons.push({ text: match[1].trim() });
  }

  // Extract input type="button" and type="submit"
  const inputButtonRegex = /<input[^>]*type=["'](button|submit)["'][^>]*>/gi;
  while ((match = inputButtonRegex.exec(html)) !== null) {
    const valueMatch = match[0].match(/value=["']([^"']+)["']/i);
    elements.buttons.push({ text: valueMatch ? valueMatch[1] : match[1] });
  }

  // Extract selects
  const selectRegex = /<select[^>]*>([\s\S]*?)<\/select>/gi;
  while ((match = selectRegex.exec(html)) !== null) {
    const nameMatch = match[0].match(/name=["']([^"']+)["']/i);
    const optionCount = (match[1].match(/<option/gi) || []).length;
    elements.selects.push({
      name: nameMatch ? nameMatch[1] : '',
      optionCount
    });
  }

  // Extract textareas
  const textareaRegex = /<textarea[^>]*>/gi;
  while ((match = textareaRegex.exec(html)) !== null) {
    const nameMatch = match[0].match(/name=["']([^"']+)["']/i);
    elements.textareas.push({
      name: nameMatch ? nameMatch[1] : ''
    });
  }

  // Extract checkboxes
  const checkboxRegex = /<input[^>]*type=["']checkbox["'][^>]*>/gi;
  while ((match = checkboxRegex.exec(html)) !== null) {
    const nameMatch = match[0].match(/name=["']([^"']+)["']/i);
    elements.checkboxes.push({
      name: nameMatch ? nameMatch[1] : ''
    });
  }

  // Extract radios
  const radioRegex = /<input[^>]*type=["']radio["'][^>]*>/gi;
  while ((match = radioRegex.exec(html)) !== null) {
    const nameMatch = match[0].match(/name=["']([^"']+)["']/i);
    elements.radios.push({
      name: nameMatch ? nameMatch[1] : ''
    });
  }

  return elements;
}

// ============================================
// Main Analysis Function
// ============================================

/**
 * @typedef {Object} MockupAnalysis
 * @property {string} filePath - Path to the analyzed file
 * @property {string} title - Page title
 * @property {FormInfo[]} forms - Detected forms
 * @property {NavigationInfo} navigation - Navigation links
 * @property {InteractiveElements} interactiveElements - Interactive elements
 * @property {boolean} valid - Whether analysis was successful
 * @property {string} [error] - Error message if analysis failed
 * @property {string} summary - Human-readable summary
 */

/**
 * Analyze a mockup HTML file
 * @param {string} filePath - Path to the HTML file
 * @returns {Promise<MockupAnalysis>} Analysis result
 */
export async function analyzeMockup(filePath) {
  try {
    const html = await readFile(filePath, 'utf-8');
    const filename = path.basename(filePath);

    const title = extractPageTitle(html, filename);
    const forms = extractForms(html);
    const navigation = extractNavigation(html);
    const interactiveElements = extractInteractiveElements(html);

    // Generate summary
    const parts = [];
    if (forms.length > 0) {
      parts.push(`${forms.length} form(s)`);
    }
    if (navigation.links.length > 0) {
      parts.push(`${navigation.links.length} nav link(s)`);
    }
    const buttonCount = interactiveElements.buttons.length;
    if (buttonCount > 0) {
      parts.push(`${buttonCount} button(s)`);
    }

    const summary = parts.length > 0
      ? `Contains: ${parts.join(', ')}`
      : 'Basic page structure';

    return {
      filePath,
      title,
      forms,
      navigation,
      interactiveElements,
      valid: true,
      summary
    };
  } catch (err) {
    return {
      filePath,
      title: '',
      forms: [],
      navigation: { links: [] },
      interactiveElements: {
        buttons: [],
        selects: [],
        textareas: [],
        checkboxes: [],
        radios: []
      },
      valid: false,
      error: err.message,
      summary: 'Analysis failed'
    };
  }
}

export default analyzeMockup;
