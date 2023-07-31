import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { diff } from 'deep-object-diff';

const BASELINE = 'https://www.example.com';
const COMPARE = 'https://www.preprod.example.com';

const PATHS = [
  '/',
]

const nameFnMap = {
  link: (link) => `${link.rel}-${link.href}`,
  meta: (meta) => meta.name || meta.property,
  script: (script) => script['@type'],
}

const getEllies = ($, tag) => $(tag)
  .get()
  .map((el) => el.attribs)

const getScripties = ($) => $('script')
  .get()
  .map((link) => link.attribs['type'] === "application/ld+json" && JSON.parse(link.children[0].data))
  .filter(x => !!x);

const sort = (arr, type) => {
  return arr.sort((a, b) => {
    const nameFn = nameFnMap[type];
    const aName = nameFn(a);
    const bName = nameFn(b);
    if (aName < bName) {
      return -1;
    }
    if (aName > bName) {
      return 1;
    }
    return 0;
  });
}

const getSEO = async (url) => {
  const response = await fetch(url);
  const body = await response.text();
  const $ = cheerio.load(body);
  const title = $('title').text();
  const links = sort(getEllies($, 'link'), 'link')
  const metas = sort(getEllies($, 'meta'), 'meta')
  const jsonLD = sort(getScripties($), 'script')

  return {
    title,
    links,
    metas,
    jsonLD,
  }
}

const results = PATHS.forEach(async (path) => {
  const base = await getSEO(`${BASELINE}${path}`);
  const compare = await getSEO(`${COMPARE}${path}`);
  console.log(path)
  console.log(diff(base, compare))
  console.log('~~~~~~~~~~')
})

