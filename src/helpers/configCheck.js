const config = require('config')
const chalk = require('chalk')
const _ = require('lodash')

module.exports = () => {
  if (_.isEmpty(config.email)) {
    console.log(
      chalk.red(
        `TeamWork email is not defined in config, you can add config by using below command:`,
      ),
    )
    console.log(chalk.green(`lptools set email YourTeamWorkEmail@domain.com`))
    return false
  }

  if (_.isEmpty(config.password)) {
    console.log(
      chalk.red(
        `TeamWork password is not defined in config, you can add config by using below command:`,
      ),
    )
    console.log(chalk.green(`lptools set password YourPassword`))
    return false
  }

  if (_.isEmpty(config.github_username)) {
    console.log(
      chalk.red(
        `Github username is not defined in config, you can add config by using below command:`,
      ),
    )
    console.log(chalk.green(`lptools set github_username YourGitHubUserName`))
    return false
  }

  if (_.isEmpty(config.github_token)) {
    console.log(
      chalk.red(
        `Github token is not defined in config, you can add config by using below command:`,
      ),
    )
    // Can be generated from here: https://github.com/settings/tokens
    console.log(chalk.green(`lptools set github_token YourGitHubToken`))
    return false
  }
}
