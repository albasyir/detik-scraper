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
let currentPage: number = 1;
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

    while (currentPage <= lastPagination) {
      listPage.on("console", (consoleObj) => {
        const msg = consoleObj.text();
        if (!msg.includes("net::ERR_FAILED")) console.warn(chalk.yellow(msg));
      });
      await listPage.goto(BaseURL + currentPage);

      console.log(" - Page " + currentPage + " visited");

      let content: string = ".latest--indeks";

      let list = await listPage.$eval(content, (el) => {
        return Array.from(el.getElementsByClassName("article__list")).map(
          (row) => {
            let article: ArticleContract = {
              title: row.getElementsByClassName("article__link")[0].innerHTML,
              category:
                row.getElementsByClassName("article__subtitle")[0].innerHTML,
              date: row.getElementsByClassName("article__date")[0].innerHTML,
              link: row.getElementsByTagName("a")[0].getAttribute("href"),
              contents: [],
            };

            return article;
          }
        );
      });

      /**
       * Create new Browser and tab for detail page for every news
       */

      list = await Promise.all(
        list.map(async (row) => {
          const context = await browser.createIncognitoBrowserContext();
          const detailPage = await context.newPage();
          await detailPage.setRequestInterception(true);
          detailPage.on("request", (req) => {
            const type = req.resourceType();
            if (type == "document") {
              req.continue();
            } else {
              req.abort();
            }
          });
          detailPage.on("console", (consoleObj) => {
            const msg = consoleObj.text();
            if (!msg.includes("net::ERR_FAILED"))
              console.warn(chalk.yellow(msg));
          });
          /**
           * going to detail page
           */
          await detailPage.goto(row.link);
          let content: string = ".read__content";

          const detail: string[] = await detailPage.$eval(content, (el) => {
            return Array.from(el.getElementsByTagName("p")).map((data) => {
              return data.innerHTML;
            });
          });
          detail.forEach((content: string) => {
            // trim it
            content = content.trim();

            // clear from html element
            content = content.replace(new RegExp("<[^>]*>", "g"), "");

            // clear line breaks
            content = content.replace("/(\r\n|\n|\r)/gm", "");
            row.contents.push(content);
          });
          /**
           * close detail page
           */
          await detailPage.close();

          return row;
        })
      );

      if (lastPagination >= currentPage) {
        scraped.push(...list);
        console.log(scraped);

        currentPage++;
      }
    }

    console.log("Scraping Done!");

    await browser.close();
    console.log("Browser closed");

    console.log("Saving...");
    /**
     * Wrtie our result to JSON
     *
     */
    let timenameText = moment().format("YYYY-MM-DD_HH-mm-ss");
    let limitText = `${currentPage}-${lastPagination}`;
    let filename = `${prefixFile}_${timenameText}_${limitText}`;

    fs.writeFileSync(
      path.join(__dirname, `../public/kompas.com/${filename}.json`),
      JSON.stringify(scraped)
    );

    console.log("Saved");

    process.exit();
  } catch (err) {
    console.error(`'Puppeteer Error Detected -> ${err}'`);
  }
})();
