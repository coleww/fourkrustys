import * as cheerio from 'cheerio'
import fetch from 'node-fetch'
import { diff } from 'deep-object-diff'

const BASELINE = 'https://example.com'
const COMPARE = 'https://preprod.example.com'

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
  .filter(x => !!x)

const sort = (arr, type) => {
  return arr.sort((a, b) => {
    const nameFn = nameFnMap[type]
    const aName = nameFn(a)
    const bName = nameFn(b)
    if (aName < bName) {
      return -1
    }
    if (aName > bName) {
      return 1
    }
    return 0
  })
}

const getSEO = async (url) => {
  const response = await fetch(url)
  const body = await response.text()
  const $ = cheerio.load(body)
  const title = $('title').text()
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

let i = 0
let pid = setInterval(async () => {
  const path = PATHS[i++]
  const base = await getSEO(`${BASELINE}${path}`)
  const compare = await getSEO(`${COMPARE}${path}`)
  const diffed = diff(base, compare)
  const hasDiff = Object.keys(diffed).length
  const emoji = hasDiff ? '🚨' : '✅'
  console.log(`${path} ${emoji}`)
  if (hasDiff) console.log(diff)
  if (i >= PATHS.length) clearInterval(pid)
}, 1000 + Math.random() * 500)