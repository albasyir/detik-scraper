import * as puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import * as moment from "moment";

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
        if (type == "stylesheet" || type == "image" || type == "font") {
          req.abort();
        } else {
          req.continue();
        }
      });
    });

    console.info("news paginate tab created, and optimized");

    /**
     * Setting page for news detail
     *
     */

    const detailPage = await context.newPage();
    await detailPage.setRequestInterception(true).then(() => {
      detailPage.on("request", (req) => {
        const type = req.resourceType();
        if (type == "stylesheet" || type == "image" || type == "font") {
          req.abort();
        } else {
          req.continue();
        }
      });
    });

    console.info("News detail tab created, and optimized");

    /**
     * Do scrap
     *
     */
    let page: number = 1;
    let maxPage: number = 3;
    let noResultFromLast: boolean = false;
    let scraped: Array<Object> = [];
    while (!noResultFromLast && page <= maxPage) {
      await listPage.goto(
        "https://www.detik.com/search/searchall?query=corona&siteid=2&sortby=time&sorttime=0&page=" +
          page
      );

      console.log(" - Page " + page + " visited");

      /**
       * Get list and find important information that we grab
       *
       */
      const list = await listPage.$eval(".list-berita", (el) => {
        let articelEl = Array.from(el.getElementsByTagName("article")).filter(
          (articel) => {
            return articel.getElementsByClassName("category")[0]?.innerHTML;
          }
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
       * Get detail post of articel
       *
       */
      list.map(async (articel) => {
        // detailPage.goto(articel.link);
        // #detikdetailtext untuk detail artikel pada detikTravel, detikhealt
        // .detail__body-text untuk detail artkel pada detikNews
        // .detail__body-tag untuk ambil tag pada detikNews, detikInet
        // semuanya buang .linksisip
        // ONLY FROM finance, news, travel, food, health
        // let contentContaner = detailPage.waitForSelector("#detikdetailtext");
        return articel;
      });

      /**
       * Desicion for next page and save, or we stop and next
       *
       */
      if (list.length > 0) {
        scraped.push(...list);
        page++;
      } else {
        noResultFromLast = true;
      }
    }

    console.log("Scaping Done!");

    /**
     * Close Browser
     *
     */
    context.close().then(() => {
      console.log("Browser closed");
    });

    /**
     * Wrtie our result to JSON
     *
     */
    fs.writeFileSync(
      path.join(
        __dirname,
        `collection/detik.com/${moment().format("YYYY-MM-DD_SSS")}.json`
      ),
      JSON.stringify(scraped)
    );

    console.log("Saved");
  } catch (err) {
    console.error(`'Puppeteer Error Detencted -> ${err}'`);
  }
})();
