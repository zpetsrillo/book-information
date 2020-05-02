const xlsx = require("xlsx");
const puppeteer = require("puppeteer");

// const wb = xlsx.readFile("books.xls", { cellDates: true });
// const ws = wb.Sheets["Purchases"];

// const data = xlsx.utils.sheet_to_json(ws);

// for (let row of data) {
//   let isbn = row["Pub #"];

//   let isbns = [];
//   if (isbn && isbn.length >= 10) {
//     isbn = isbn.replace(/-/g, ``);
//     isbns.push(isbn);
//   }
// }

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
  try {
    const [el] = await page.$x(xpath);
    const txt = await el.getProperty("textContent");
    const rawTxt = await txt.jsonValue();
    return rawTxt;
  } catch (error) {
    return null;
  }
};

const getDataFromProductDetails = (productDetails) => {
  let pages;
  try {
    pages = /:\s(\d+)\spages/g.exec(productDetails)[1];
  } catch (error) {
    pages = null;
  }

  let publisher;
  try {
    publisher = /Publisher:\s(.*)\n/.exec(productDetails)[1];
  } catch (error) {
    publisher = null;
  }

  let language;
  try {
    language = /Language:\s(.*)\n/.exec(productDetails)[1];
  } catch (error) {
    language = null;
  }

  let isbn10;
  try {
    isbn10 = /ISBN-10:\s(.*)\n/.exec(productDetails)[1];
  } catch (error) {
    isbn10 = null;
  }

  let isbn13;
  try {
    isbn13 = /ISBN-13:\s(.*)\n/.exec(productDetails)[1];
  } catch (error) {
    isbn13 = null;
  }

  let productDimensions;
  try {
    productDimensions = /(\d*\.?\d*\sx\s\d*\.?\d*\sx\s\d*\.?\d*\s\w+)/g.exec(
      productDetails
    )[1];
  } catch (error) {
    productDimensions = null;
  }

  let shippingWeight;
  try {
    shippingWeight = /Shipping Weight:\s(.*)\(/.exec(productDetails)[1];
  } catch (error) {
    shippingWeight = null;
  }

  if (productDimensions) {
    productDimensions = productDimensions.trim();
  }
  if (shippingWeight) {
    shippingWeight = shippingWeight.trim();
  }

  return {
    pages,
    publisher,
    language,
    isbn10,
    isbn13,
    productDimensions,
    shippingWeight,
  };
};

const getBookByIsbn = async (page, isbn) => {
  await page.goto(`https://www.amazon.com/s?k=${isbn}&i=stripbooks`);

  try {
    await clickByText(page, `Paperback`);
  } catch (error) {
    try {
      await clickByText(page, `Hardcover`);
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

  let author = await getTextFromXPath(page, '//*[@id="bylineInfo"]/span');

  try {
    author = author.replace(/(\{.*\})/g, "");
    author = author.trim();
    author = /((\w|\s)+.*\(\w+\))/g.exec(author)[1];
    author = author.replace(/(\n|\t)/g, "");
    author = author.replace(/\s\s+/g, " ");
  } catch (error) {
    author = null;
  }

  author = author.trim();

  const productDetails = await getTextFromXPath(
    page,
    '//*[@id="productDetailsTable"]/tbody/tr/td/div/ul'
  );

  return { title, price, author, productDetails };
};

const getDataFromAmazon = async (isbns) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  for (let isbn of isbns) {
    let { title, price, author, productDetails } = await getBookByIsbn(
      page,
      isbn
    );
    title = title.trim();
    let {
      pages,
      publisher,
      language,
      isbn10,
      isbn13,
      productDimensions,
      shippingWeight,
    } = getDataFromProductDetails(productDetails);
    console.log({
      title,
      price,
      author,
      pages,
      publisher,
      language,
      isbn10,
      isbn13,
      productDimensions,
      shippingWeight,
    });
  }

  await browser.close();
};

getDataFromAmazon(["9780593128404", "9781591847786", "9781683642947"]);
