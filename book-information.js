const xlsx = require("xlsx");
const puppeteer = require("puppeteer");

const wb = xlsx.readFile("books.xls", { cellDates: true });
const ws = wb.Sheets["Purchases"];

const data = xlsx.utils.sheet_to_json(ws);

// console.log(data);

const escapeXpathString = (str) => {
  const splitedQuotes = str.replace(/'/g, `', "'", '`);
  return `concat('${splitedQuotes}', '')`;
};

const clickByText = async (page, text) => {
  const escapedText = escapeXpathString(text);
  const linkHandlers = await page.$x(`//a[contains(text(), ${escapedText})]`);

  if (linkHandlers.length > 0) {
    await linkHandlers[0].click();
  } else {
    throw new Error(`Link not found: ${text}`);
  }
};

const getTextFromXPath = async (page, xpath) => {
  const [el] = await page.$x(xpath);
  const txt = await el.getProperty("textContent");
  const rawTxt = await txt.jsonValue();
  return rawTxt;
};

const getBookByIsbn = async (page, isbn) => {
  await page.goto(`https://www.amazon.com/s?k=${isbn}&i=stripbooks`);

  try {
    await clickByText(page, `Hardcover`);
  } catch (error) {
    try {
      await clickByText(page, `Paperback`);
    } catch (error) {
      return null;
    }
  }

  await page.waitForNavigation({ waitUntil: "load" });

  const title = await getTextFromXPath(page, '//*[@id="productTitle"]');
  const price = await getTextFromXPath(
    page,
    '//*[@id="buyNewSection"]/h5/div/div[2]/div/span[2]'
  );

  return { title, price };
};

const getDataFromAmazon = async (isbns) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  for (let isbn of isbns) {
    let { title, price } = await getBookByIsbn(page, isbn);
    console.log(title, price);
  }

  await browser.close();
};

getDataFromAmazon(["9780593128404", "9781591847786", "9781683642947"]);
