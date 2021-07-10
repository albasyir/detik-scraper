import * as puppeteer from "puppeteer";
// import * as fs from "fs";
// import * as path from "path";
// import * as moment from "moment";

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

    console.log("We shouldn't load IMAGE, CSS, and FONT..");

    let page: number = 1;
    let maxPage: number = 3;
    let noResultFromLast: boolean = false;
    let scraped: Array<Object> = [];

    while (!noResultFromLast && page <= maxPage) {
      await listPage.goto(
        "https://indeks.kompas.com/?site=nasional&q=corona&page=" + page
      );

      console.log(" - Page " + page + " visited");
      // get list
      listPage.on("console", function (log) {
        console.log(log.text());
      });
      const list = await listPage.$eval(".latest--indeks", (el) => {
        return Array.from(el.getElementsByClassName(".article__list"))[0];
      });
    }

    console.log("Scaping Done!");

    await browser.close();
    console.log("Browser closed");
  } catch (err) {
    console.error(`'Puppeteer Error Detected -> ${err}'`);
  }
})();
