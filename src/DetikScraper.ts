import * as puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import * as moment from "moment";
// class paging > a untuk paginate ambil href

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: [
        "--allow-external-pages",
        "--allow-third-party-modules",
        "--data-reduction-proxy-http-proxies",
        "--no-sandbox",
      ],
    });

    const context = await browser.createIncognitoBrowserContext();
    const listPage = await context.newPage();

    console.log("Browser launched");

    // optimize fetching
    await listPage.setRequestInterception(true);
    listPage.on("request", (req) => {
      const type = req.resourceType();
      if (type == "stylesheet" || type == "image" || type == "font") {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log("We should not load IMAGE CSS and FONT..");

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
      // get list
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

      // get detail
      const detailPage = await context.newPage();

      list.map((articel) => {
        detailPage.goto(articel.link);

        // #detikdetailtext untuk detail artikel pada detikTravel, detikhealt
        // .detail__body-text untuk detail artkel pada detikNews

        // .detail__body-tag untuk ambil tag pada detikNews, detikInet
        // semuanya buang .linksisip

        // ONLY FROM finance, news, travel, food, health

        let contentContaner = detailPage.waitForSelector("#detikdetailtext");

        return articel;
      });

      if (list.length > 0) {
        scraped.push(...list);
        page++;
      } else {
        noResultFromLast = true;
      }
    }

    console.log("Scaping Done!");

    await browser.close();
    console.log("Browser closed");

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
