import ArticelContract from "./Contracts/ArticleContract";

import * as puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import * as moment from "moment";
import * as chalk from "chalk";
import * as sastrawi from "sastrawijs"

let firstPage: number = 1;
let maxPage: number = 10; // max 1111

interface ScrapDetailResult {
  from: string;
  content?: Array<string>;
}

/**
 * Scrap Category Hendler
 *
 */
const scrap = {
  async detikTravel(page: puppeteer.Page): Promise<ScrapDetailResult> {
    // skip kalo ke 20.detik.com
    if (page.url().includes("20.detik.com")) return null;

    let content: string = "#detikdetailtext";
    if (page.url().includes("/cerita-perjalanan/")) {
      content = ".read__content";
    }

    return await page.$eval(content, (el) => {
      let article: ScrapDetailResult = {
        from: Array.from(el.getElementsByTagName("b"))[0]?.innerText ||
          Array.from(el.getElementsByTagName("strong"))[0]?.innerText,
        
        content: Array.from(el.getElementsByTagName("p")).map(
        (el) => el.innerHTML)
      };

      return article;
    });
  },

  // async detikNews(page: puppeteer.Page) {
  //    TODO
  // },

  // async detikFinance(page: puppeteer.Page) {
  //    TODO
  // },

  // async detikFood(page: puppeteer.Page) {
  //    TODO
  // },

  // async detikHealth(page: puppeteer.Page) {
  //    TODO
  // },
};

(async () => {
  try {
    /**
     * Pripare Browser
     *
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

    console.info("Puppeteer Lauched");

    /**
     * Create Incognito Browser
     *
     */
    const context = await browser.createIncognitoBrowserContext();

    console.info("Browser Incognito Created");

    /**
     * Setting page for pagination list
     *
     */
    const listPage = await context.newPage();
    await listPage.setRequestInterception(true).then(() => {
      listPage.on("request", (req) => {
        const type = req.resourceType();
        if (type == "document") {
          req.continue();
        } else {
          req.abort();
        }
      });
    });

    console.info("news paginate tab created, and optimized");

    /**
     * Tokenizer and Stemmer of the Contents Features
     * 
     */
    const stemmer = new sastrawi.Stemmer();
    const tokenizer = new sastrawi.Tokenizer();

    /**
     * Do scrap
     *
     */
    let stillSearch: boolean = true;
    let scraped: Array<Object> = [];

    let page: number = firstPage;
    while (stillSearch && page <= maxPage) {
      await listPage.goto(
        "https://www.detik.com/search/searchall?query=corona&siteid=2&sortby=time&sorttime=0&page=" +
          page
      );

      console.info(" - " + chalk.yellow("Paginate " + page + " visited"));

      /**
       * Get list and find important information that we grab
       *
       */
      let articles: Array<ArticelContract> = await listPage.$eval(".list-berita", (el) => {
        let articelEl = Array.from(el.getElementsByTagName("article")).filter(
          (articel) => articel.getElementsByClassName("category")[0]?.innerHTML
        );

        return articelEl.map((articel) => ({
          title: articel.getElementsByClassName("title")[0]?.innerHTML,
          category: articel.getElementsByClassName("category")[0]?.innerHTML,
          date: articel
            .getElementsByClassName("date")[0]
            ?.innerHTML.split("</span>")[1],
          link: articel.getElementsByTagName("a")[0].getAttribute("href"),
        }));
      });

      /**
       * Get articel only data that the our target
       * 
       */
      articles = await Promise.all(
        articles.filter((articel: ArticelContract) => Object.keys(scrap).includes(articel.category))
      );

      /**
       * Setting page for news detail
       *
       */
      let result = await Promise.all(
        articles.map(async (articel: ArticelContract) => {
          console.log("  ", articel.category, articel.link);

          const detailPage = await context.newPage();
          await detailPage.setRequestInterception(true).then(() => {
            detailPage.on("request", (req: puppeteer.HTTPRequest) => {
              if (req.resourceType() == "document") {
                req.continue();
              } else {
                req.abort();
              }
            });
          });

          /**
           * Console to show error from backend
           * 
           */
          detailPage.on("console", (consoleObj) => {
            const msg = consoleObj.text();
            if (!msg.includes("net::ERR_FAILED"))
              console.warn(chalk.yellow(msg));
          });
          
          /**
           * Visit the page for get content and from
           * 
           */
          await detailPage.goto(articel.link);
          let detail: ScrapDetailResult = await scrap[articel.category](
            detailPage
          );

          if (detail) {
            articel.from = detail.from;
            articel.contents = [];
            articel.feature = [];
            articel.tokenized = [];

            detail.content.forEach((paragraph: string) => {
              // skip empty paragraph
              if (!paragraph || paragraph == '') return;

              // clear from element
              paragraph = paragraph.replace(new RegExp('<[^>]*>', 'g'), '');

              // push to our content result
              articel.contents.push(paragraph);

              // tokenized string
              let tokenizedWords: Array<string> = tokenizer.tokenize(paragraph);
              articel.tokenized.push(tokenizedWords);

              // FILL feature
              for (let word of tokenizedWords) {
                let stemmed: string = stemmer.stem(word);

                // fill feature array of
                if (!articel.feature.includes(stemmed)) {
                  articel.feature.push(stemmed);
                }
              }
            })
          }

          await detailPage.close();

          return articel;
        })
      );

      /**
       * Desicion for next page and save, or we stop searching
       *
       */
      if (maxPage > page) {
        scraped.push(...result);
        page++;
      } else {
        stillSearch = false;
        console.log("Scaping Done!");
      }
    }

    /**
     * Wrtie our result to JSON
     *
     */
    fs.writeFileSync(
      path.join(
        __dirname,
        `../public/detik.com/${moment().format(
          "YYYY-MM-DD"
        )}_${firstPage}-${maxPage}.json`
      ),
      JSON.stringify(scraped)
    );

    console.log("Saved");
  } catch (err) {
    console.error(`'Puppeteer Error Detencted -> ${err}'`);
  }
})();
