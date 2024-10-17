import fs from 'fs';
import * as puppeteer from 'puppeteer';
import path, { resolve } from 'path';
import { BoundingBox, FinalElement, VisionElement, PuppeteerElement } from './types';
import { generateElementName } from './openaiModule';

// Function to inject the CSS Selector Generator into Puppeteer page
export async function injectCssSelectorGenerator(page: puppeteer.Page): Promise<void> {
  const cssSelectorGeneratorPath = path.resolve(
    __dirname, 
    'node_modules/css-selector-generator/dist/index.umd.js'
  );
  
  const cssSelectorGeneratorScript = fs.readFileSync(cssSelectorGeneratorPath, 'utf8');

  // Inject the script into the page
  await page.evaluate((script) => {
    const scriptElement = document.createElement('script');
    scriptElement.textContent = script;
    document.head.appendChild(scriptElement);
  }, cssSelectorGeneratorScript);
}

export async function captureScreenshot(url: string): Promise<{ browser: puppeteer.Browser; page: puppeteer.Page; screenshotPath: string }> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Set viewport size as needed
  await page.setViewport({ width: 1920, height: 1080 });

  // Navigate to the target URL
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Capture and save screenshot
  const d = new Date();
  let time = d.getTime();
  const screenshotPath = resolve(`../documents/screenshots/${url}_${time}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  return { browser, page, screenshotPath };
}

export async function extractInteractiveElements(page: puppeteer.Page): Promise<PuppeteerElement[]> {
  const interactiveElements: PuppeteerElement[] = await page.evaluate(() => {
    // List of selectors for interactive elements
    const selectors = [
      'button',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="switch"]',
      '[role="slider"]',
      '[role="menuitem"]',
      '[role="tab"]',
      // Add more selectors as needed
    ].join(',');

    const elements = Array.from(document.querySelectorAll(selectors));

    return elements.map((el) => {
      const rect = el.getBoundingClientRect();
      const elementType = el.getAttribute('role') || el.tagName.toLowerCase();
      let recognizedText = '';

      // Check if el is an HTMLElement and then access its innerText or aria-label
      if (el instanceof HTMLElement) {
        recognizedText = el.innerText || el.getAttribute('aria-label') || '';
      }
  
      // Check if el is an HTMLInputElement to access the value
      if (el instanceof HTMLInputElement) {
        recognizedText = el.value || recognizedText;
      }

      // Extract relevant attributes
      const attributes: { [key: string]: string } = {};
      const attrKeys = ['id', 'class', 'name', 'aria-label', 'title', 'placeholder', 'type'];
      attrKeys.forEach((key) => {
        const value = el.getAttribute(key);
        if (value) {
          attributes[key] = value;
        }
      });

      return {
        cssSelector: '', // Will be populated later
        elementType,
        boundingBox: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        recognizedText,
        attributes,
      };
    });
  });

  return interactiveElements;
}

export async function generateCssSelectors(page: puppeteer.Page, elements: PuppeteerElement[]): Promise<PuppeteerElement[]> {
  const updatedSelectors: string[] = await page.evaluate(() => {
    const selectors: string[] = [];
    const allElements = Array.from(document.querySelectorAll('*'));

    for (const el of allElements) {
      const selector = (window as any).cssSelectorGenerator.getSelector(el);
      selectors.push(selector);
    }

    return selectors;
  });

  // Assign the generated selectors back to the PuppeteerElement array
  return elements.map((el, index) => ({
    ...el,
    cssSelector: updatedSelectors[index] || `generated-selector-${index + 1}`,
  }));
}

export function convertNormalizedToAbsolute(boundingBox: BoundingBox, imageWidth: number, imageHeight: number): BoundingBox {
  // Assuming normalized coordinates (0 to 1), convert to absolute pixels
  return {
    x: boundingBox.x * imageWidth,
    y: boundingBox.y * imageHeight,
    width: boundingBox.width * imageWidth,
    height: boundingBox.height * imageHeight,
  };
}

function boundingBoxesOverlap(box1: BoundingBox, box2: BoundingBox): boolean {
  const overlap = !(box1.x + box1.width < box2.x ||
                    box1.x > box2.x + box2.width ||
                    box1.y + box1.height < box2.y ||
                    box1.y > box2.y + box2.height);

  return overlap;
}

export async function mergeElements(
  visionElements: VisionElement[],
  puppeteerElements: PuppeteerElement[]
): Promise<FinalElement[]> {
  const finalElements: FinalElement[] = [];

  for (const visionElem of visionElements) {
    const visionBox = visionElem.boundingBox; // Assuming one bounding box per VisionElement

    const matchingPuppeteer = puppeteerElements.find((puppeteerElem) =>
      boundingBoxesOverlap(visionBox, puppeteerElem.boundingBox)
    );

    if (matchingPuppeteer) {
      // Generate a meaningful name using OpenAI
      const name = await generateElementName(matchingPuppeteer);

      finalElements.push({
        cssSelector: matchingPuppeteer.cssSelector,
        elementType: matchingPuppeteer.elementType,
        recognizedText: visionElem.recognizedText || matchingPuppeteer.recognizedText,
        boundingBox: matchingPuppeteer.boundingBox,
        attributes: matchingPuppeteer.attributes,
        name: name || 'unknown-element',
      });
    } else {
      // Vision element without Puppeteer match
      // Generate a name based on Vision data
      const name = await generateElementName({
        cssSelector: `vision-element-${finalElements.length + 1}`,
        elementType: visionElem.name,
        boundingBox: {
          x: visionBox.x,
          y: visionBox.y,
          width: visionBox.width,
          height: visionBox.height,
        },
        recognizedText: visionElem.recognizedText,
        attributes: {},
      });

      finalElements.push({
        cssSelector: `vision-element-${finalElements.length + 1}`,
        elementType: visionElem.name,
        recognizedText: visionElem.recognizedText,
        boundingBox: visionElem.boundingBox,
        attributes: {},
        name: name || 'unknown-element',
      });
    }
  }

  // Add Puppeteer elements not matched by Vision
  for (const puppeteerElem of puppeteerElements) {
    const alreadyExists = finalElements.some(
      (elem) => elem.cssSelector === puppeteerElem.cssSelector
    );
    if (!alreadyExists) {
      // Generate a meaningful name using OpenAI
      const name = await generateElementName(puppeteerElem);

      finalElements.push({
        cssSelector: puppeteerElem.cssSelector,
        elementType: puppeteerElem.elementType,
        recognizedText: puppeteerElem.recognizedText,
        boundingBox: puppeteerElem.boundingBox,
        attributes: puppeteerElem.attributes,
        name: name || 'unknown-element',
      });
    }
  }

  // Remove any potential duplicates based on CSS selectors
  const uniqueFinalElements = removeDuplicates(finalElements);

  return uniqueFinalElements;
}

function removeDuplicates(elements: FinalElement[]): FinalElement[] {
  const seen = new Set<string>();
  return elements.filter((elem) => {
    const identifier = elem.cssSelector;
    if (seen.has(identifier)) {
      return false;
    }
    seen.add(identifier);
    return true;
  });
}
