import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import express, { Request, Response } from 'express';
import {
  captureScreenshot,
  extractInteractiveElements,
  injectCssSelectorGenerator,
  generateCssSelectors,
  mergeElements,
  convertNormalizedToAbsolute
} from '../services/puppeteerModule';
import { analyzeImageWithVisionAPI } from '../services/visionModule';
import {
  VisionElement,
  FinalElement
} from '../services/types';

const router = express.Router();

router.get('/pageObjects', (req: Request, res: Response) => {
  setTimeout(async () => {
    res.sendFile('po.js', { root: __dirname + '/../documents/generated/' })
  }, 3000)
});

router.post("/generate", async (req: Request, res: Response) => {
  const { url } = req.body;

  try {
    // Step 1: Capture Screenshot with Puppeteer
    const { browser, page, screenshotPath } = await captureScreenshot(url);

    // Step 2: Inject css-selector-generator into the page
    await injectCssSelectorGenerator(page);

    // Step 3: Extract Interactive Elements with Puppeteer
    const puppeteerElements = await extractInteractiveElements(page);

    // Step 4: Generate CSS Selectors for Puppeteer Elements
    const puppeteerElementsWithSelectors = await generateCssSelectors(page, puppeteerElements);

    // Close Puppeteer as it's no longer needed
    await browser.close();

    // Step 5: Analyze Screenshot with Vision API
    const visionElements = await analyzeImageWithVisionAPI(screenshotPath);

    // Step 6: Convert Vision Bounding Boxes to Absolute Coordinates
    const image = sharp(screenshotPath);
    const metadata = await image.metadata();
    const imageWidth = metadata.width || 1920;
    const imageHeight = metadata.height || 1080;

    const visionElementsAbsolute = visionElements.map((elem: VisionElement) => ({
      ...elem,
      boundingBox: convertNormalizedToAbsolute(elem.boundingBox, imageWidth, imageHeight),
    }));

    // Step 7: Merge Vision and Puppeteer Elements with Naming
    const finalElements: FinalElement[] = await mergeElements(visionElementsAbsolute, puppeteerElementsWithSelectors);

    // Step 8: Output Final JSON and save a copy for future use
    const outputPath = path.join(__dirname, 'interactiveElements.json');
    fs.writeFileSync(outputPath, JSON.stringify(finalElements, null, 2));

    res.send(finalElements);
    
  } catch (error) {
    console.error('Error in processing:', error);
    res.send(`Error in processing: ${error}`);
  }
})

export { router as pageObjectModelGeneratorRouter }