import { Context, Schema } from 'koishi'
import {} from 'koishi-plugin-puppeteer'

export const name = 'database-operate'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export const inject = ['database', 'puppeteer']

export function apply(ctx: Context) {
  ctx.command('database', '数据库操作')

  ctx.command("database.tables", "获取所有表名")
    .usage("获取数据库内所有表名")
    .action(async ({session}) => {
      const tables = ctx.database.tables
      const rows = Object.keys(tables).map(t => `<tr><td>${t}</td></tr>`)
      return await ctx.puppeteer.render(
        `<html style="width: fit-content">
          <head>
            <style>
              th {
                background:#f3f3f3 !important;
              }
            </style>
          </head>
        
          <body style="height: fit-content; min-height: 50%">
            <table border="1" cellpadding="5" style="margin: 10px; border-collapse: collapse">
              <tbody align="center" valign="center">
                <tr>
                  <th>表名</th>
                </tr>
                ${rows.join("\n")}
              </tbody>
            </table>
          </body>
        </html>`)
    })
    
  ctx.command('database.get <tableName:string> [query:string]', '查询', {checkArgCount: true})
    .usage("查询指定表内符合条件的数据行\ntableName为表名， query为任意数量的查询条件键值对，以半角逗号分割")
    .example('database.get koishi_user name:koishi,age:18')
    .action(async ({session}, tableName, query) => {
      const tables = ctx.database.tables
      if (!Object.keys(tables).includes(tableName)) return "找不到该表，请检查表名是否正确"

      const queryArray = query.split(",")

      let queries = {}
      for (const q of queryArray) {
        if (q.includes(":")) {
          const [key, value] = q.split(":")
          if (!Object.keys(tables[tableName].fields).includes(key)) return `该表不存在'${key}'字段，请检查查询条件是否正确`
          queries[key] = value
        } else {
          return "请输入正确的查询条件，例如：'name:koishi'，'age:18'，'name:koishi,age:18'等"
        }
      }

      const result = await ctx.database.get(tableName as any, queries)

      if (result.length === 0) return "查询结果为空"

      let th = []
      let rows = []

      for (const key of Object.keys(result[0])) {
        th.push(`<th>${String(key).replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</th>`)
      }

      for (const item of result) {
        rows.push("<tr>")
        for (const value of Object.values(item)) {
          rows.push(`<td>${String(value).replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</td>`)
        }
        rows.push("</tr>")
      }

      return await ctx.puppeteer.render(
        `<html style="width: fit-content">
          <head>
            <style>
              th {
                background:#f3f3f3 !important;
              }
            </style>
          </head>
        
          <body style="height: fit-content; min-height: 50%">
            <table border="1" cellpadding="5" style="margin: 10px; border-collapse: collapse">
              <tbody align="center" valign="center">
                <tr>
                  ${th.join("\n")}
                </tr>
                ${rows.join("\n")}
              </tbody>
            </table>
          </body>
        </html>`)
  })

  ctx.command("database.create <tableName:string> <data:string>", "插入", {checkArgCount: true})
    .usage("向指定表插入一行数据\ntableName为表名，data为任意数量的数据键值对，以半角逗号分割")
    .example('database.create koishi_user name:koishi,age:18')
    .action(async ({session}, tableName, data) => {
      const tables = ctx.database.tables
      if (!Object.keys(tables).includes(tableName)) return "找不到该表，请检查表名是否正确"

      const dataArray = data.split(",")

      let dataObject = {}
      for (const d of dataArray) {
        if (d.includes(":")) {
          const [key, value] = d.split(":")
          if (!Object.keys(tables[tableName].fields).includes(key)) return `该表不存在'${key}'字段，请检查键名是否正确`
          dataObject[key] = value
        } else {
          return "请输入正确的键值对，例如：'name:koishi'，'age:18'，'name:koishi,age:18'等"
        }
      }

      const result = await ctx.database.create(tableName as any, dataObject)

      const th = Object.keys(result).map(key => `<th ${Object.keys(dataObject).includes(key) ? 'style="background:#f3f3f3 !important;"' : 'style="background:#c9f3cc !important"'}>${String(key).replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</th>`)
      const rows = Object.values(result).map(value => `<td>${String(value).replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</td>`)

      return await ctx.puppeteer.render(
        `<html style="width: fit-content">
          <head>

          </head>
        
          <body style="height: fit-content; min-height: 50%">
            <p style="font-size:150%; margin-left: 10px; margin-bottom: 0">成功向${tableName}表插入以下数据</p>
            <p style="font-size:150%; margin-left: 10px; margin-top: 0">淡绿色表示字段为默认值：</p>
            <table border="1" cellpadding="5" style="margin: 10px; border-collapse: collapse">
              <tbody align="center" valign="center">
                <tr>
                  ${th.join("\n")}
                </tr>
                <tr>
                  ${rows.join("\n")}
                </tr>
              </tbody>
            </table>
          </body>
        </html>`)
    })

  ctx.command("database.set <tableName:string> <query:string> <data:string>", "修改", {checkArgCount: true})
    .usage("修改指定表的数据\ntableName为表名，query为任意数量的查询条件键值对，data为任意数量要修改的数据的键值对，以半角逗号分割")
    .example("database.set koishi_user name:koishi,age:18 name:koishi,age:300")
    .action(async ({session}, tableName, query, data) => {
      const tables = ctx.database.tables
      if (!Object.keys(tables).includes(tableName)) return "找不到该表，请检查表名是否正确"

      const queryArray = query.split(",")
      const dataArray = data.split(",")

      let queries = {}
      for (const q of queryArray) {
        if (q.includes(":")) {
          const [key, value] = q.split(":")
          if (!Object.keys(tables[tableName].fields).includes(key)) return `该表不存在'${key}'字段，请检查键名是否正确`
          queries[key] = value
        } else {
          return "请输入正确的键值对，例如：'name:koishi'，'age:18'，'name:koishi,age:18'等"
        }
      }

      let dataObject = {}
      for (const d of dataArray) {
        if (d.includes(":")) {
          const [key, value] = d.split(":")
          if (!Object.keys(tables[tableName].fields).includes(key)) return `该表不存在'${key}'字段，请检查键名是否正确`
          dataObject[key] = value
        } else {
          return "请输入正确的键值对，例如：'name:koishi'，'age:18'，'name:koishi,age:18'等"
        }
      }

      const before = await ctx.database.get(tableName as any, queries)
      if (before.length === 0) return "找不到匹配的数据行"

      let thBefore = []
      let rowsBefore = []

      for (const key of Object.keys(before[0])) {
        thBefore.push(`<th>${String(key).replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</th>`)
      }

      for (const item of before) {
        rowsBefore.push("<tr>")
        for (const value of Object.values(item)) {
          rowsBefore.push(`<td>${String(value).replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</td>`)
        }
        rowsBefore.push("</tr>")
      }

      const result = await ctx.database.set(tableName as any, queries, dataObject)

      const after = await ctx.database.get(tableName as any, queries)

      let thAfter = []
      let rowsAfter = []

      for (const key of Object.keys(after[0])) {
        thAfter.push(`<th>${String(key).replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</th>`)
      }

      for (const item of after) {
        rowsAfter.push("<tr>")
        for (const value of Object.values(item)) {
          rowsAfter.push(`<td>${String(value).replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</td>`)
        }
        rowsAfter.push("</tr>")
      }

      return await ctx.puppeteer.render(
        `<html style="width: fit-content">
          <head>
            <style>
              th {
                background:#f3f3f3 !important;
              }
            </style>
          </head>
        
          <body style="height: fit-content; min-height: 50%">
            <p style="font-size:150%; margin-left: 10px; ">修改前：</p>
            <table border="1" cellpadding="5" style="margin: 10px; border-collapse: collapse">
              <tbody align="center" valign="center">
                <tr>
                  ${thBefore.join("\n")}
                </tr>
                ${rowsBefore.join("\n")}
              </tbody>
            </table>

            <p style="font-size:150%; margin-left: 10px; ">修改后：</p>
            <table border="1" cellpadding="5" style="margin: 10px; border-collapse: collapse">
              <tbody align="center" valign="center">
                <tr>
                  ${thAfter.join("\n")}
                </tr>
                ${rowsAfter.join("\n")}
              </tbody>
            </table>
          </body>
        </html>`)
    })

  ctx.command("database.remove <tableName:string> <query:string>", "删除", {checkArgCount: true})
    .usage("删除指定表的任意数据行\ntableName为表名，query为任意数量的查询条件键值对，以半角逗号分割")
    .example("database.remove koishi_user name:nonebot,age:18")
    .action(async ({session}, tableName, query) => {
      const tables = ctx.database.tables
      if (!Object.keys(tables).includes(tableName)) return "找不到该表，请检查表名是否正确"

      const queryArray = query.split(",")

      let queries = {}
      for (const q of queryArray) {
        if (q.includes(":")) {
          const [key, value] = q.split(":")
          if (!Object.keys(tables[tableName].fields).includes(key)) return `该表不存在'${key}'字段，请检查键名是否正确`
          queries[key] = value
        } else {
          return "请输入正确的键值对，例如：'name:koishi'，'age:18'，'name:koishi,age:18'等"
        }
      }

      const data = await ctx.database.get(tableName as any, queries)

      if (data.length === 0) return "找不到匹配的数据行"

      let th = []
      let rows = []

      for (const key of Object.keys(data[0])) {
        th.push(`<th>${String(key).replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</th>`)
      }

      for (const item of data) {
        rows.push("<tr>")
        for (const value of Object.values(item)) {
          rows.push(`<td>${String(value).replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</td>`)
        }
        rows.push("</tr>")
      }

      await session.send(await ctx.puppeteer.render(
        `<html style="width: fit-content">
          <head>
            <style>
              th {
                background:#f3f3f3 !important;
              }
            </style>
          </head>
        
          <body style="height: fit-content; min-height: 50%">
            <p style="font-size:150%; margin-left: 10px; margin-bottom: 0">如果你确定你要删除以下数据行</p>
            <p style="font-size:150%; margin-left: 10px; margin-top: 0">请在30秒内发送“确认”</p>
            <table border="1" cellpadding="5" style="margin: 10px; border-collapse: collapse">
              <tbody align="center" valign="center">
                <tr>
                  ${th.join("\n")}
                </tr>
                ${rows.join("\n")}
              </tbody>
            </table>
          </body>
        </html>`))

      const confirm = await session.prompt(30000)
      if (confirm !== "确认") return "已取消删除操作"
      
      const result = await ctx.database.remove(tableName as any, queries)

      return `成功删除以上共${result.matched ? `${result.matched}行` : "0行"}数据`
    })

}
