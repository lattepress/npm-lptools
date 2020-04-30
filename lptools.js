#!/usr/bin/env node
// index.js

process.env['SUPPRESS_NO_CONFIG_WARNING'] = true

global.__basePath = __dirname

/**
 * This is the common way to import a package in NodeJS.
 * The CommonJS module system is used.
 */

const mycli = require('commander')
const config = require('config')
const mainAction = require('./src/actions/index')
const buildAction = require('./src/actions/build')
const setAction = require('./src/actions/set')
const collect = require('./src/helpers/collect')
const {version} = require('./package')

/**
 * Without using `.command`, this works as the root command.
 */
mycli
  .version(version, '-v, --version')
  .option('-u, --username <name>', `specify the user's name`)
  .option('-a, --age [age]', `specify the user's age`)
  .option(
    '-g, --gender [gender]',
    `specify the user's gender`,
    /^(male|female)$/i,
    'private',
  )
  .option('-i, --additional-info [info]', 'additional information', collect, [])
  .option('-s, --silent', 'disable output')
  .option('--no-gender-output', 'disable gender output')

mycli
  .command('build')
  .arguments('[date]')
  .description('build today report')
  .action(buildAction)

mycli
  .command('set')
  .arguments('<key> <value>')
  .option('-r, --repos', 'Repository name')
  .description('Set configuration options')
  .action(setAction)

/**
 * Other commands will be redirected to the help message.
 */
mycli.command('*').action(() => mycli.help())

/**
 * This line is necessary for the command to take effect.
 */
mycli.parse(process.argv)

/**
 * Call `mainAction` only when no command is specified.
 */
if (mycli.args.length === 0) mainAction(mycli)
