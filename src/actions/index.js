const bot = require('../helpers/bot')

module.exports = cmd => {
  if (!cmd.silent) {
    const nameLine = `Hello ${
      typeof cmd.username === 'string' ? cmd.username : 'world'
    }`
    bot(nameLine)
  }
}
