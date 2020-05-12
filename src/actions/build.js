const configFile = global.__basePath + '/config/local.json'
const axios = require('axios')
const _ = require('lodash')
var table = require('json-to-markdown-table')
const util = require('util')
const fs = require('fs')
const chalk = require('chalk')
const md = require('markdown-it')({
  html: true,
})
const readFile = util.promisify(fs.readFile)

const configCheck = require('../helpers/configCheck')

const writeFile = util.promisify(fs.writeFile)

let config = JSON.parse(fs.readFileSync(configFile, 'utf8'))
let sendMessage = false
const buildReport = async (logs, reportDate) => {
  let mapped = []
  logs.forEach((x, i) => {
    let merged = false
    if ('' === x.description) {
      let existing = mapped.findIndex(coll => {
        return coll.task === x.description
      })

      if (-1 !== existing) {
        mapped[existing].hours = x.hours
        mapped[existing].minutes = x.minutes
        mapped[existing].time = `${
          mapped[existing].hours > 0 ? mapped[existing].hours + 'h:' : '0h:'
        }${mapped[existing].minutes}m`

        merged = true
      }
    }

    let taskName = '' === x.description ? x['todo-item-name'] : x.description

    if (!merged) {
      mapped.push({
        id: x['todo-item-id'],
        projectName: x['project-name'],
        task: taskName,
        url: `https://projects.growthlabs.agency/#/tasks/${x['todo-item-id']}`,
        hours: x.hours,
        minutes: x.minutes,
        completed: x.completed,
        tags: x['task-tags'].map(
          tag =>
            '<span class="w-tags__tag" style="background:' +
            tag.color +
            '">' +
            tag.name +
            '</span>',
        ),
        time: `${x.hours > 0 ? x.hours + 'h:' : '0h:'}${x.minutes}m`,
      })
    }
  })

  const grouped = _.groupBy(mapped, 'projectName')

  const dirName = `${
    global.__basePath
  }/reports/${reportDate.getFullYear()}/${reportDate.toLocaleString('en-us', {
    month: 'short',
  })}/${reportDate.getDate()}`

  // Create directory if not exists.
  if (!fs.existsSync(dirName)) {
    fs.mkdirSync(dirName, {recursive: true})
  }

  if (grouped.length < 1) {
    return console.log(chalk.red('No entries found!!'))
  }

  for (const key of Object.keys(grouped)) {
    console.log(
      `\n\n—————————————————————— ${chalk.bgMagenta(
        `Start report of ${key}`,
      )} ——————————————————————`,
    )
    const res = await writeProjectReport(reportDate, dirName, key, grouped[key])
  }
}

const secondsToHms = d => {
  d = Number(d)
  const h = Math.floor(d / 3600)
  const m = Math.floor((d % 3600) / 60)
  const s = Math.floor((d % 3600) % 60)

  const hDisplay = h > 0 ? h + (h == 1 ? ' hour, ' : ' hours, ') : ''
  const mDisplay = m > 0 ? m + (m == 1 ? ' minute, ' : ' minutes, ') : ''
  const sDisplay = s > 0 ? s + (s == 1 ? ' second' : ' seconds') : ''
  return hDisplay + mDisplay + sDisplay
}

const minutesToDecimal = d => {
  d = Number(d)
  const h = Math.floor(d / 3600)
  const m = Math.floor((d % 3600) / 60)
  const deci = m / 60
  return (h + deci).toFixed(2)
}

const writeProjectReport = async (reportDate, dirName, project, logs) => {
  let weekDay = reportDate.toLocaleString('en-us', {weekday: 'short'})

  let sl = 1
  logs = logs.map(x => {
    x.sl = sl++ + '.'
    x.task = `[${x.task.replace(/(\r\n|\n|\r)/gm, '')}](${x.url})`
    x.status = x.tags ? x.tags.join(', ') : ''
    return x
  })
  // Convert hours and minutes to second.
  const totalTime = logs.reduce((sum, log) => {
    return sum + (log.hours * 3600 + log.minutes * 60)
  }, 0)

  let txt = table(logs, ['sl', 'time', 'status', 'task'])

  const formattedTime = `${secondsToHms(totalTime)} [${minutesToDecimal(
    totalTime,
  )}]`

  const grouped = _.uniq(logs, 'id')
  const groupedByTask = _.uniqBy(logs, 'id')

  const fileName = `${project}-${weekDay}-${formattedTime}.txt`.replace(
    /[/\\?%*:|"<> ]/g,
    '_',
  )

  let commitsText = ''
  const commits = await getCommits(reportDate, project)

  if (commits.length > 0) {
    commitsText = `
**COMMITS (${commits.length})**\n`
    let commitIndex = 1
    commits.forEach(x => {
      if (
        !x.commit.message.includes('Merge pull request') &&
        !x.commit.message.includes('Merged branch')
      ) {
        commitsText += `\n${commitIndex}. [${x.commit.message.replace(
          /(\r\n|\n|\r)/gm,
          '',
        )}](${x.html_url})`
        commitIndex++
      }
    })
  }

  txt = `${reportDate.toLocaleString('en-us', {
    weekday: 'long',
  })}, ${reportDate.getDate()} ${reportDate.toLocaleString('en-us', {
    month: 'long',
  })}

Total time spent: ${formattedTime}

Worked on total ${groupedByTask.length} tasks.

Total ${logs.length} time entries.


**TASKS:**
${txt}
${commitsText}

Auto generated by "Report builder".
    `
  await postToTeamWork(project, txt)
  return writeFile(`${dirName}/${fileName}`, txt, 'utf8').then(() => {
    console.log(`\n${txt}`)
    console.log('—————————————————————— End of report ——————————————————————')
    console.log(`Report file generated at ${dirName}/${fileName}`)
  })
}

const postToTeamWork = async (project, body) => {
  if (!sendMessage) return
  if (!config.projects[project] || !config.projects[project].messageId) {
    console.log('No daily report message id found')
    return
  }

  let messageId = config.projects[project].messageId

  const {data} = await axios.post(
    `https://projects.growthlabs.agency/messages/${messageId}/messageReplies.json`,
    {
      messageReply: {
        body: md.render(body),
        notify: '247059,234104',
        'notify-current-user': true,
      },
    },
    {
      auth: {
        username: config.email,
        password: config.password,
      },
    },
  )

  console.log(
    `https://projects.growthlabs.agency/#/messages/${messageId}?pmp=${data.id}`,
  )
}

const getCommits = async (reportDate, project) => {
  // If no project info then return.
  if (
    !config.projects[project] ||
    !config.projects[project].repos ||
    config.projects[project].repos.length === 0
  ) {
    return []
  }

  const projectInfo = config.projects[project]
  const until = new Date(reportDate.toISOString())

  const params = {
    since: reportDate.toISOString(),
    until: new Date(until.setUTCHours(24, 0, 0, 0)).toISOString(),
    author: config.github_username,
  }

  let allCommits = []

  for (const repo of projectInfo.repos) {
    try {
      const {data} = await axios.get(
        `https://api.github.com/repos/lattepress/${repo}/commits`,
        {
          params,
          auth: {
            username: config.github_username,
            password: config.github_token,
            author: config.github_username,
          },
        },
      )
      allCommits = allCommits.concat(data)
    } catch (err) {
      console.log(err)
    }
  }

  return allCommits
}

module.exports = async (date = false, cmd) => {
  sendMessage = 'yes' === cmd.message ? true : false
  if (configCheck() === false) {
    return console.log(chalk.red('Required config missing!'))
  }

  let reportDate = new Date()
  if (!date) {
    reportDate.setUTCHours(0, 0, 0, 0)
    reportDate.setDate(reportDate.getDate() - 1)
    const yesterday = reportDate.toISOString().split('T')[0]
    date = yesterday
  } else {
    reportDate = new Date(date)
  }

  console.log(chalk.bgGreen(`\n\n\n   Generating report for : ${date}   `))
  try {
    const growthLabsData = await axios.get(
      'https://projects.growthlabs.agency/time_entries.json',
      {
        params: {
          fromdate: date,
          todate: date,
          userId: config.glUserId,
        },
        auth: {
          username: config.email,
          password: config.password,
        },
      },
    )

    const data = growthLabsData.data['time-entries']

    // if (data.STATUS != 'OK') {
    //   return console.log(
    //     chalk.bgRed(
    //       `Something went wrong, fetching time log failed. Status: ${data.STATUS}`,
    //     ),
    //   )
    // }

    if (data.length === 0) {
      return console.log(chalk.bgRed('No time entries found for this day!!'))
    }

    console.log(chalk.bgBlue(`Total ${data.length} time entries found.`))

    let newConfig = config
    let configChanged = false
    data.forEach(entry => {
      if (
        !config.projects[entry['project-name']] ||
        !config.projects[entry['project-name']].id
      ) {
        configChanged = true
        newConfig.projects[entry['project-name']] = {
          id: entry['project-id'],
        }
      }
    })

    if (configChanged) {
      await writeFile(configFile, JSON.stringify(newConfig, null, 2), 'utf8')
      config = JSON.parse(fs.readFileSync(configFile, 'utf8'))
    }

    await buildReport(data, reportDate)
    console.log(`\n\nHappy coding!!`)
  } catch (err) {
    console.log(`Failed to get time log entry from TeamWork`)
    return console.log(err)
  }

  console.log(
    chalk.blue(
      `Let me know if you have any suggestions or found any errors at rah12@live.com — Rahul Aryan`,
    ),
  )
}
