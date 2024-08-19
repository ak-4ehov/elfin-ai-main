import axios, { AxiosRequestConfig } from "axios";
import crawlerConfig from '../services/crawler-config';

export type CrawledHtmlData = {
  url: string;
  html: string;
  success: boolean;
  error?: {
    message: string
  }
}

export type DataForCrawling = {
  url: string
  apikey: string
}
/**
 * @param  {string} url
 */
export async function getCrawledHtmlData (data: DataForCrawling): Promise<CrawledHtmlData> {
  const { url } = data
  if (isUrlValid(url) && isWhiteListed(url)) {
    try {
      const response = await axios(getAxiosConfig(data));
      return { url, html: response.data, success: true };
    } catch (error) {
      return {
        url,
        html: '',
        success: false,
        error: { message: "Failed to crawl the provided URL" }
      }
    }
  }
  return {
    url,
    html: '',
    success: false,
    error: { message: "Provided URL is not whitelisted" }
  }
}


export function getHtmlBody (html: string): string {
  const startIndex = html.indexOf('<body>');
  const endIndex = html.indexOf('</body>');

  const data = html.slice(startIndex + 6, endIndex);

  return data;
}

function isWhiteListed (url: string): boolean {

  return crawlerConfig.whiteListedDomains.some(domain => url.match(domain));
}

function isUrlValid (url: string): boolean {
  const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
  return urlPattern.test(url);
}

function getAxiosConfig (data: DataForCrawling): AxiosRequestConfig {
  const { url, apikey } = data

  const validApiKey = process.env.INTERNAL_API_KEY
  if (validApiKey && apikey !== validApiKey) {
    throw new Error("Invalid API KEY")
  }
  const checkUrl = new URL(url);
  const config: AxiosRequestConfig = {
    url: checkUrl.pathname,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36',
      'x-api-key': apikey,
      'Accept': 'text/html'
    },
    baseURL: checkUrl.origin,
    method: 'GET',
  }
  return config
}

