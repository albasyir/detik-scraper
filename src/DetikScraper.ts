import * as puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import * as moment from "moment";
import * as chalk from "chalk";

let firstPage: number = 1;
let maxPage: number = 1000;

interface ScrapDetailResult {
  from: string;
  content?: Array<string>;
}

const scrap = {
  async detikTravel(page: puppeteer.Page) {
    // skip kalo ke 20.detik.com
    if (page.url().includes("20.detik.com")) return null;

    let content: string = "#detikdetailtext";
    if (page.url().includes("/cerita-perjalanan/")) {
      content = ".read__content";
    }

    return await page.$eval(content, (el) => {
      let article: ScrapDetailResult = {
        from: "",
        content: [],
      };

      article.from =
        Array.from(el.getElementsByTagName("b"))[0]?.innerText ||
        Array.from(el.getElementsByTagName("strong"))[0]?.innerText;

      article.content = Array.from(el.getElementsByTagName("p")).map(
        (el) => el.innerHTML
      );

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
      let list = await listPage.$eval(".list-berita", (el) => {
        let articelEl = Array.from(el.getElementsByTagName("article")).filter(
          (articel) => articel.getElementsByClassName("category")[0]?.innerHTML
        );

        return articelEl.map((articel) => ({
          title: articel.getElementsByClassName("title")[0]?.innerHTML,
          from: "",
          category: articel.getElementsByClassName("category")[0]?.innerHTML,
          date: articel
            .getElementsByClassName("date")[0]
            ?.innerHTML.split("</span>")[1],
          link: articel.getElementsByTagName("a")[0].getAttribute("href"),
          content: [],
        }));
      });

      list = await Promise.all(
        list.filter((articel) => Object.keys(scrap).includes(articel.category))
      );

      let result = await Promise.all(
        list.map(async (articel) => {
          console.log("  ", articel.category, articel.link);

          /**
           * Setting page for news detail
           *
           */
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

          detailPage.on("console", (consoleObj) => {
            const msg = consoleObj.text();
            if (!msg.includes("net::ERR_FAILED"))
              console.warn(chalk.yellow(msg));
          });

          if (scrap[articel.category]) {
            await detailPage.goto(articel.link);
            let detail: ScrapDetailResult = await scrap[articel.category](
              detailPage
            );

            if (detail) {
              articel.from = detail.from;
              articel.content = detail.content;
            }

            await detailPage.close();
          }

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
        `collection/detik.com/${moment().format(
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
