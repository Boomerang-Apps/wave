/**
 * TDD Tests for Mockup Analysis (Launch Sequence)
 *
 * Phase 2, Step 2.3: Mockup Analysis Function
 *
 * Tests the analyzeMockup() function that extracts information
 * from HTML mockup files (title, forms, navigation, interactions).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to create mock functions
const { mockReadFile } = vi.hoisted(() => ({
  mockReadFile: vi.fn()
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: { readFile: mockReadFile },
  readFile: mockReadFile
}));

import {
  analyzeMockup,
  extractPageTitle,
  extractForms,
  extractNavigation,
  extractInteractiveElements
} from '../utils/mockup-analysis.js';

describe('Mockup Analysis', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // extractPageTitle Tests
  // ============================================

  describe('extractPageTitle', () => {
    it('should extract title from <title> tag', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>Home Page</title></head>
          <body></body>
        </html>
      `;
      expect(extractPageTitle(html)).toBe('Home Page');
    });

    it('should extract title from <h1> when no <title> tag', () => {
      const html = `
        <!DOCTYPE html>
        <html>
          <body><h1>Welcome to Our App</h1></body>
        </html>
      `;
      expect(extractPageTitle(html)).toBe('Welcome to Our App');
    });

    it('should return filename-derived title when no title or h1', () => {
      const html = '<html><body><p>Hello</p></body></html>';
      expect(extractPageTitle(html, 'about-us.html')).toBe('About Us');
    });

    it('should handle empty title tag', () => {
      const html = '<html><head><title></title></head></html>';
      expect(extractPageTitle(html, 'contact.html')).toBe('Contact');
    });

    it('should trim whitespace from title', () => {
      const html = '<html><head><title>  My Page  </title></head></html>';
      expect(extractPageTitle(html)).toBe('My Page');
    });
  });

  // ============================================
  // extractForms Tests
  // ============================================

  describe('extractForms', () => {
    it('should detect form elements', () => {
      const html = `
        <form id="login-form">
          <input type="text" name="username">
          <input type="password" name="password">
          <button type="submit">Login</button>
        </form>
      `;
      const forms = extractForms(html);

      expect(forms).toHaveLength(1);
      expect(forms[0].id).toBe('login-form');
    });

    it('should count input fields per form', () => {
      const html = `
        <form id="signup">
          <input type="text" name="name">
          <input type="email" name="email">
          <input type="password" name="password">
          <input type="submit" value="Sign Up">
        </form>
      `;
      const forms = extractForms(html);

      expect(forms[0].inputCount).toBe(4);
    });

    it('should detect multiple forms', () => {
      const html = `
        <form id="form1"></form>
        <form id="form2"></form>
        <form id="form3"></form>
      `;
      const forms = extractForms(html);

      expect(forms).toHaveLength(3);
    });

    it('should return empty array when no forms', () => {
      const html = '<html><body><p>No forms here</p></body></html>';
      const forms = extractForms(html);

      expect(forms).toEqual([]);
    });

    it('should detect form actions', () => {
      const html = '<form action="/api/submit" method="POST"></form>';
      const forms = extractForms(html);

      expect(forms[0].action).toBe('/api/submit');
      expect(forms[0].method).toBe('POST');
    });
  });

  // ============================================
  // extractNavigation Tests
  // ============================================

  describe('extractNavigation', () => {
    it('should detect navigation links in <nav> element', () => {
      const html = `
        <nav>
          <a href="/home">Home</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
        </nav>
      `;
      const nav = extractNavigation(html);

      expect(nav.links).toHaveLength(3);
      expect(nav.links.map(l => l.text)).toContain('Home');
    });

    it('should detect links in header', () => {
      const html = `
        <header>
          <a href="/">Logo</a>
          <a href="/products">Products</a>
        </header>
      `;
      const nav = extractNavigation(html);

      expect(nav.links.length).toBeGreaterThan(0);
    });

    it('should include href attribute for each link', () => {
      const html = '<nav><a href="/page1">Page 1</a></nav>';
      const nav = extractNavigation(html);

      expect(nav.links[0].href).toBe('/page1');
      expect(nav.links[0].text).toBe('Page 1');
    });

    it('should return empty array when no navigation', () => {
      const html = '<html><body><p>No nav</p></body></html>';
      const nav = extractNavigation(html);

      expect(nav.links).toEqual([]);
    });

    it('should detect footer navigation', () => {
      const html = `
        <footer>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </footer>
      `;
      const nav = extractNavigation(html);

      expect(nav.links).toHaveLength(2);
    });
  });

  // ============================================
  // extractInteractiveElements Tests
  // ============================================

  describe('extractInteractiveElements', () => {
    it('should detect buttons', () => {
      const html = `
        <button id="btn1">Click Me</button>
        <button id="btn2">Submit</button>
      `;
      const elements = extractInteractiveElements(html);

      expect(elements.buttons).toHaveLength(2);
    });

    it('should detect input buttons', () => {
      const html = `
        <input type="button" value="Action">
        <input type="submit" value="Submit">
      `;
      const elements = extractInteractiveElements(html);

      expect(elements.buttons.length).toBeGreaterThan(0);
    });

    it('should detect select dropdowns', () => {
      const html = `
        <select name="country">
          <option value="us">USA</option>
          <option value="uk">UK</option>
        </select>
      `;
      const elements = extractInteractiveElements(html);

      expect(elements.selects).toHaveLength(1);
      expect(elements.selects[0].optionCount).toBe(2);
    });

    it('should detect textareas', () => {
      const html = '<textarea name="message"></textarea>';
      const elements = extractInteractiveElements(html);

      expect(elements.textareas).toHaveLength(1);
    });

    it('should detect checkboxes and radios', () => {
      const html = `
        <input type="checkbox" name="agree">
        <input type="radio" name="choice" value="a">
        <input type="radio" name="choice" value="b">
      `;
      const elements = extractInteractiveElements(html);

      expect(elements.checkboxes).toHaveLength(1);
      expect(elements.radios).toHaveLength(2);
    });

    it('should return counts for all element types', () => {
      const html = '<html><body></body></html>';
      const elements = extractInteractiveElements(html);

      expect(elements).toHaveProperty('buttons');
      expect(elements).toHaveProperty('selects');
      expect(elements).toHaveProperty('textareas');
      expect(elements).toHaveProperty('checkboxes');
      expect(elements).toHaveProperty('radios');
    });
  });

  // ============================================
  // analyzeMockup Tests
  // ============================================

  describe('analyzeMockup', () => {
    it('should return complete analysis object', async () => {
      mockReadFile.mockResolvedValue(`
        <!DOCTYPE html>
        <html>
          <head><title>Test Page</title></head>
          <body>
            <nav><a href="/">Home</a></nav>
            <form id="test"><input type="text"></form>
            <button>Click</button>
          </body>
        </html>
      `);

      const result = await analyzeMockup('/path/to/mockup.html');

      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('forms');
      expect(result).toHaveProperty('navigation');
      expect(result).toHaveProperty('interactiveElements');
      expect(result).toHaveProperty('valid');
    });

    it('should mark analysis as valid when file is readable', async () => {
      mockReadFile.mockResolvedValue('<html><body></body></html>');

      const result = await analyzeMockup('/path/to/mockup.html');

      expect(result.valid).toBe(true);
    });

    it('should mark analysis as invalid when file read fails', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));

      const result = await analyzeMockup('/path/to/missing.html');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should include file path in result', async () => {
      mockReadFile.mockResolvedValue('<html></html>');

      const result = await analyzeMockup('/path/to/mockup.html');

      expect(result.filePath).toBe('/path/to/mockup.html');
    });

    it('should generate summary of mockup content', async () => {
      mockReadFile.mockResolvedValue(`
        <html>
          <head><title>Dashboard</title></head>
          <body>
            <form><input><input></form>
            <button>Save</button>
            <button>Cancel</button>
          </body>
        </html>
      `);

      const result = await analyzeMockup('/path/to/dashboard.html');

      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe('string');
    });
  });

  // ============================================
  // Edge Cases
  // ============================================

  describe('edge cases', () => {
    it('should handle malformed HTML gracefully', () => {
      const html = '<html><body><p>Unclosed tags';
      const title = extractPageTitle(html, 'page.html');

      // Should not throw
      expect(title).toBeDefined();
    });

    it('should handle HTML with no head or body', () => {
      const html = '<div>Just content</div>';
      const title = extractPageTitle(html, 'simple.html');

      expect(title).toBe('Simple');
    });

    it('should handle empty HTML', () => {
      const html = '';
      const forms = extractForms(html);
      const nav = extractNavigation(html);
      const elements = extractInteractiveElements(html);

      expect(forms).toEqual([]);
      expect(nav.links).toEqual([]);
      expect(elements.buttons).toEqual([]);
    });

    it('should handle special characters in content', () => {
      const html = '<html><head><title>Test &amp; Demo</title></head></html>';
      const title = extractPageTitle(html);

      expect(title).toContain('Test');
    });
  });
});
