const util = require('util')
const fs = require('fs')

const writeFile = util.promisify(fs.writeFile)
const readFile = util.promisify(fs.readFile)

module.exports = async (key, value = '', cmd) => {
  const configFile = global.__basePath + '/config/default.json'
  if (!fs.existsSync(configFile)) {
    await writeFile(configFile, '{}', 'utf8')
  }

  const data = await readFile(configFile, 'utf8')
  obj = JSON.parse(data)
  console.log(key, value)
  if ('project' === key) {
    console.log(cmd.repos)
    if (!cmd.repos)
      throw Error('Repos required. Pass its like --repos "Project Name"')

    value = {
      [value]: {
        repos: cmd.repos,
      },
    }
  }
  obj[key] = value
  json = JSON.stringify(obj, null, 2)
  await writeFile(configFile, json, 'utf8')

  console.log(`Config updated ${key}=${value}`)
}
