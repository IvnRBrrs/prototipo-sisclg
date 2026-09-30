export function rowsToObjects(rows, columns) {
  if (!columns || !rows) return rows
  return rows.map(row => {
    const obj = {}
    for (let i = 0; i < columns.length; i++) {
      obj[columns[i]] = row[i]
    }
    return obj
  })
}
