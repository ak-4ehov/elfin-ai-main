import express, { Request, Response } from 'express';
import { getCrawledHtmlData, getHtmlBody, CrawledHtmlData } from '../services/crawler';
import { generatePageObjectModel, PageObjectModel } from '../services/open-ai';
import { verifyPageObjectModel } from '../services/verifier';

const router = express.Router();

router.get('/pageObjects', (req: Request, res: Response) => {
  setTimeout(async () => {
    res.sendFile('po.json', { root: __dirname + '/../documents/generated/' })
  }, 3000)
});

router.post("/generate", async (req: Request, res: Response) => {
  const { url } = req.body
  const { apikey } = req.headers as { apikey: string }
  const crawledData: CrawledHtmlData = await getCrawledHtmlData({ url, apikey });
  if (!crawledData.success) {
    return res.status(400).json(crawledData.error)
  }
  const htmlBody = getHtmlBody(crawledData.html)
  const result: PageObjectModel = await generatePageObjectModel({ url, data: htmlBody })
  return res.json(result)

})

router.post("/verify", async (req: Request, res: Response) => {
  const result = await verifyPageObjectModel({ ...req.body })
  return res.json(result)
})


export { router as pageObjectModelGeneratorRouter }