// Script to export the data_values for all variables attached to charts

import * as db from 'db/db'
import * as _ from 'lodash'
import * as settings from 'settings'

import { DB_NAME, DB_USER, DB_PASS, DB_HOST, DB_PORT } from 'serverSettings'
import { exec } from 'utils/server/serverUtil'

async function dataExport() {
    await db.connect()

    const tmpFile = "/tmp/owid_chartdata.sql"

    const variablesToExportQuery = `
        SELECT DISTINCT cd.variableId FROM chart_dimensions cd
        WHERE NOT EXISTS (select * from tags t join chart_tags ct on ct.tagId = t.id where ct.chartId=cd.chartId and t.name='Private')
    `

    const variableIds = (await db.query(variablesToExportQuery)).map((row: any) => row.variableId)

    console.log(`Exporting data for ${variableIds.length} variables to ${tmpFile}`)

    await exec(`rm -f ${tmpFile}`)

    // Expose password to mysqldump
    // Safer than passing as an argument because it's not shown in 'ps aux'
    process.env.MYSQL_PWD = DB_PASS

    let count = 0
    for (const chunk of _.chunk(variableIds, 100)) {
        await exec(`mysqldump --no-create-info -u '${DB_USER}' -h '${DB_HOST}' -P ${DB_PORT} ${DB_NAME} data_values --where="variableId IN (${chunk.join(",")})" >> ${tmpFile}`)

        count += chunk.length
        console.log(count)
    }

    await db.end()
}

dataExport()
