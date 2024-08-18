
import { PageObjectModel, ElementModel } from "./open-ai"
import puppeteer from "puppeteer"

export async function verifyPageObjectModel (body: PageObjectModel): Promise<PageObjectModel> {
  let pageObjectModel = JSON.parse(JSON.stringify(body))
  console.log(JSON.stringify(body.elements[0].verification));
  console.log(JSON.stringify(pageObjectModel.elements[0].verification));
  await checkElements(pageObjectModel);

  calculatePassRate(pageObjectModel);

  return pageObjectModel
}

function addMessage (element: ElementModel, message: string) {
  if (!element.verification.messages) {
    return element.verification.messages = [message];
  }
  return element.verification.messages.push(message);
}


async function checkElements (body: PageObjectModel): Promise<PageObjectModel> {
  // Launch the browser and open a new blank page
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  // Navigate the page to a URL
  await page.goto(body.url);
  for (const element of body.elements) {
    try {
      await page.waitForSelector(element.cssSelector, { timeout: 2000 });
      element.verification.status = true;
    } catch (error) {
      element.verification.status = false;
      addMessage(element, `Element ${element.cssSelector} not found in DOM.`);
      body.success = false;
    }
    try {
      await page.waitForSelector(`::-p-xpath(${element.xpathSelector})`, { timeout: 2000 });
      element.verification.status = true;
    } catch (error) {
      element.verification.status = false;
      addMessage(element, `Element ${element.xpathSelector} not found in DOM.`);
      body.success = false;
    }
  }
  return body
}

function calculatePassRate (body: PageObjectModel): void {
  const totalElements = body.elements.length;
  const totalVerifiedElements = body.elements.filter(element => element.verification.status).length;
  body.passRate = Math.round(totalVerifiedElements / totalElements * 100)
}