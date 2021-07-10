import ArticleContract from "./Contracts/ArticleContract";

import * as puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import * as moment from "moment";
import * as chalk from "chalk";
import * as sastrawi from "sastrawijs";

/**
 * Init & Declare prefix file, and pagination
 */
const prefixFile: string = "example";
const firstPagination: number = 1;
const lastPagination: number = 3;
const BaseURL: string = "https://indeks.kompas.com/?site=all&q=corona&page=";
(async () => {
  try {
    /**
     * Setup Browser
     */
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--allow-external-pages",
        "--allow-third-party-modules",
        "--data-reduction-proxy-http-proxies",
        "--no-sandbox",
      ],
    });
    /**
     * Create Incognito Browser
     */
    const context = await browser.createIncognitoBrowserContext();
    const listPage = await context.newPage();

    console.log("Browser launched");

    /**
     *
     *  Optimize Fetching Data
     *
     *    - if type on request == document then continute
     *
     */
    await listPage.setRequestInterception(true);
    listPage.on("request", (req) => {
      const type = req.resourceType();
      if (type == "document") {
        req.continue();
      } else {
        req.abort();
      }
    });

    console.log("We ONLY accept HTML");

    /**
     * Scraped data dumped at here
     */
    let scraped: Array<Object> = [];

    while (firstPagination <= lastPagination) {
      listPage.on("console", (consoleObj) => {
        const msg = consoleObj.text();
        if (!msg.includes("net::ERR_FAILED")) console.warn(chalk.yellow(msg));
      });
      await listPage.goto(BaseURL + firstPagination);

      console.log(" - Page " + firstPagination + " visited");
      let content: string = ".latest--indeks";
      const list = await listPage.$eval(content, (el) => {
        return Array.from(el.getElementsByClassName("article__list")).map(
          (row) => {
            let article = {
              title: row.getElementsByClassName("article__link")[0].innerHTML,
              category: row.getElementsByClassName("article__subtitle")[0].innerHTML,
              date: row.getElementsByClassName("article__date")[0].innerHTML
            }
            
            console.log(article);
            
            return article;
          }
        );
      });
      console.log(list);
    }

    console.log("Scraping Done!");

    await browser.close();
    console.log("Browser closed");
  } catch (err) {
    console.error(`'Puppeteer Error Detected -> ${err}'`);
  }
})();