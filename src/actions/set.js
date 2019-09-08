const util = require('util')
const fs = require('fs')

const writeFile = util.promisify(fs.writeFile)
const readFile = util.promisify(fs.readFile)

module.exports = async (key, value) => {
  if (!fs.existsSync('config/local.json')) {
    await writeFile('config/local.json', '{}', 'utf8')
  }

  const data = await readFile('config/local.json', 'utf8')
  obj = JSON.parse(data)
  obj[key] = value
  json = JSON.stringify(obj, null, 2)
  await writeFile('config/local.json', json, 'utf8')

  console.log(`Config updated ${key}=${value}`)
}
