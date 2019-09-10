const util = require('util')
const fs = require('fs')

const writeFile = util.promisify(fs.writeFile)
const readFile = util.promisify(fs.readFile)

module.exports = async (key, value) => {
  const configFile = global.__basePath + '/config/local.json'
  if (!fs.existsSync(configFile)) {
    await writeFile(configFile, '{}', 'utf8')
  }

  const data = await readFile(configFile, 'utf8')
  obj = JSON.parse(data)
  obj[key] = value
  json = JSON.stringify(obj, null, 2)
  await writeFile(configFile, json, 'utf8')

  console.log(`Config updated ${key}=${value}`)
}
