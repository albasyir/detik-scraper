import ArticelContract from "./Contracts/ArticleContract";

import * as puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import * as moment from "moment";
import * as chalk from "chalk";
import * as sastrawi from "sastrawijs";

const prefixfile = "release";
const firstPagination: number = 1;
const lastPagination: number = 1000; // max 1111

interface ScrapDetailResult {
  from: string;
  contents?: Array<string>;
}

/**
 * Scrap Category Hendler
 *
 */
const scrap = {
  async detikTravel(page: puppeteer.Page): Promise<ScrapDetailResult> {
    let content: string = "#detikdetailtext";
    if (page.url().includes("/cerita-perjalanan/")) {
      content = ".read__content";
    }

    return await page.$eval(content, (el) => {
      let article: ScrapDetailResult = {
        from:
          Array.from(el.getElementsByTagName("b"))[0]?.innerText ||
          Array.from(el.getElementsByTagName("strong"))[0]?.innerText,

        contents: Array.from(el.getElementsByTagName("p")).map(
          (p) => p.innerHTML
        ),
      };

      return article;
    });
  },

  async detikNews(page: puppeteer.Page): Promise<ScrapDetailResult> {
    const endpoint: string = page.url();
    const contentContainer: string = ".itp_bodycontent";

    let paginate: number;

    try {
      paginate = await page.$eval(".detail__anchor", (el) => {
        return Array.from(el.getElementsByTagName("a")).length;
      });
    } catch (e) {
      paginate = 1;
    }

    let articel: ScrapDetailResult = {
      from: await page.$eval(
        contentContainer,
        (el) =>
          Array.from(el.getElementsByTagName("strong"))[0]?.innerText ||
          Array.from(el.getElementsByTagName("b"))[0]?.innerText
      ),

      contents: [],
    };

    for (let currentPage = 1; currentPage <= paginate; currentPage++) {
      await page.goto(endpoint + "/" + currentPage);

      let paragraph: Array<string> = await page.$eval(contentContainer, (el) =>
        Array.from(el.getElementsByTagName("p")).map((p) => p.innerHTML)
      );

      articel.contents.push(...paragraph);
    }

    return articel;
  },

  async detikFinance(page: puppeteer.Page): Promise<ScrapDetailResult> {
    let content: string = ".itp_bodycontent";

    return await page.$eval(content, (el) => {
      let articel: ScrapDetailResult = {
        from:
          Array.from(el.getElementsByTagName("strong"))[0]?.innerText ||
          Array.from(el.getElementsByTagName("b"))[0]?.innerText,

        contents: Array.from(el.getElementsByTagName("p")).map(
          (p) => p.innerHTML
        ),
      };

      return articel;
    });
  },

  async detikFood(page: puppeteer.Page): Promise<ScrapDetailResult> {
    let content: string = ".itp_bodycontent";

    return await page.$eval(content, (el) => {
      let articel: ScrapDetailResult = {
        from:
          Array.from(el.getElementsByTagName("strong"))[0]?.innerText ||
          Array.from(el.getElementsByTagName("b"))[0]?.innerText,

        contents: Array.from(el.getElementsByTagName("p")).map(
          (p) => p.innerHTML
        ),
      };

      return articel;
    });
  },

  async detikHealth(page: puppeteer.Page): Promise<ScrapDetailResult> {
    if (page.url().includes("/infografis/")) return;
    let content: string = "#detikdetailtext";

    return page.$eval(content, (el) => {
      let articel: ScrapDetailResult = {
        from:
          Array.from(el.getElementsByTagName("strong"))[0].innerText ||
          Array.from(el.getElementsByTagName("b"))[0].innerText,
        contents: Array.from(el.getElementsByTagName("p")).map(
          (p) => p.innerHTML
        ),
      };

      return articel;
    });
  },
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
    let scraped: Array<Object> = [];

    let currentPage: number = firstPagination;

    while (currentPage <= lastPagination) {
      let paginateURL: string =
        "https://www.detik.com/search/searchall?query=corona&siteid=2&sortby=time&sorttime=0&page=" +
        currentPage;

      await listPage.goto(paginateURL);

      console.info(
        " - " + chalk.yellow("Paginate " + currentPage + " visited")
      );

      /**
       * Get list and find important information that we grab
       *
       */
      let articles: Array<ArticelContract> = await listPage.$eval(
        ".list-berita",
        (el) => {
          let articelEl = Array.from(el.getElementsByTagName("article")).filter(
            (articel) =>
              articel.getElementsByClassName("category")[0]?.innerHTML
          );

          return articelEl.map((articel) => ({
            title: articel.getElementsByClassName("title")[0]?.innerHTML,
            category: articel.getElementsByClassName("category")[0]?.innerHTML,
            date: articel
              .getElementsByClassName("date")[0]
              ?.innerHTML.split("</span>")[1],
            link:
              articel.getElementsByTagName("a")[0].getAttribute("href") +
              "?single=1",
          }));
        }
      );

      /**
       * Get articel only data that the our target
       *
       */
      articles = await Promise.all(
        articles.filter((articel: ArticelContract) =>
          Object.keys(scrap).includes(articel.category)
        )
      );

      /**
       * Setting page for news detail
       *
       */
      let result = await Promise.all(
        articles.map(async (articel: ArticelContract) => {
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

          let detail: ScrapDetailResult;

          if (articel.link == detailPage.url()) {
            console.log("  ", articel.category, articel.link);
            detail = await scrap[articel.category](detailPage);
          }

          if (detail) {
            articel.from = detail.from;
            articel.contents = [];
            articel.feature = [];
            articel.tokenized = [];

            detail.contents.forEach((paragraph: string) => {
              // trim it
              paragraph = paragraph.trim();

              // clear from html element
              paragraph = paragraph.replace(new RegExp("<[^>]*>", "g"), "");

              // clear line breaks
              paragraph = paragraph.replace("/(\r\n|\n|\r)/gm", "");

              // skip empty paragraph
              if (
                !paragraph ||
                paragraph == "" ||
                paragraph.includes("[Gambas") ||
                paragraph.includes("Lihat Video:")
              )
                return;

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
            });
          }

          await detailPage.close();

          return articel;
        })
      );

      /**
       * Filter By Content
       *
       */
      result = result.filter(({ contents }) => contents && contents.length > 0);

      /**
       * Desicion for next page and save, or we stop searching
       *
       */
      if (lastPagination >= currentPage) {
        scraped.push(...result);
        currentPage++;
      }
    }

    console.log("Saving...");

    /**
     * Wrtie our result to JSON
     *
     */
    let timenameText = moment().format("YYYY-MM-DD_HH-mm-ss");
    let limitText = `${firstPagination}-${lastPagination}`;
    let filename = `${prefixfile}_${timenameText}_${limitText}`;

    fs.writeFileSync(
      path.join(__dirname, `../public/detik.com/${filename}.json`),
      JSON.stringify(scraped)
    );

    console.log("Saved");

    process.exit();
  } catch (err) {
    console.error(`'Puppeteer Error Detencted -> ${err}'`);
  }
})();
