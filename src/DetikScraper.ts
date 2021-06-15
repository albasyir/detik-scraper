import * as puppeteer from "puppeteer";
import * as fs from "fs";
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
    let maxPage: number = 10;
    let noResultFromLast: boolean = false;
    let scraped: Array<Object> = [];

    while (noResultFromLast == false && maxPage && page >= maxPage) {
      await listPage.goto(
        "https://www.detik.com/search/searchall?query=corona&siteid=2&sortby=time&sorttime=0&page=" +
          page
      );

      console.log(" - Page " + page + " visited");

      const list = await listPage.$eval(".list-berita", (el) => {
        let articelEl = Array.from(el.getElementsByTagName("article"));

        return articelEl.map((article) => ({
          title: article.getElementsByClassName("title")[0]?.innerHTML,
          category: article.getElementsByClassName("category")[0]?.innerHTML,
          date: article.getElementsByClassName("date")[0]?.innerHTML,
        }));
      });

      if (list.length > 0) {
        scraped.push(list);
        page++;
      } else {
        noResultFromLast = true;
      }
    }

    console.log("Scaping Done!");

    fs.writeFileSync("collection/detik.com.json", scraped.toString());

    console.log("Saved");

    await browser.close();

    console.log("Browser closed");
  } catch (err) {
    console.error(`'Puppeteer Error Detencted -> ${err}'`);
  }
})();
