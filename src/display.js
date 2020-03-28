const colors = require('colors')

/**
 * @param {{[key: string]: any}[]} data 
 * @param {{[key: string]: number}} columns 
 * @param {boolean} show_keys 
 */
function render(data, columns, show_keys = true) {
  if (show_keys) {
    for (const col in columns) {
      const padding = columns[col] - col.length
      process.stdout.write(colors.cyan(col))
      process.stdout.write(''.padStart(padding, ' '))
      process.stdout.write('   ')
    }

    process.stdout.write('\n')
  }

  for (const row of data) {
    for (const col in columns) {
      const column_length = columns[col]
      const value = '' + (row[col] || '')

      const padding = column_length - value.length

      process.stdout.write('' + value)
      process.stdout.write(''.padStart(padding, ' '))
      process.stdout.write('   ')
    }

    process.stdout.write('\n')
  }

  process.stdout.write('\n')
}

/**
 * @param  {...string[]} sets 
 */
function get_ordered_set(...sets) {
  const set = []

  sets.forEach(array => {
    array.forEach((item, i) => {
      if (set.indexOf(item) === -1) {
        if (i > 0) {
          const set_i = set.indexOf(array[i - 1])
          set.splice(set_i + 1, 0, item)
        } else {
          set.push(item)
        }
      }
    })
  })

  return set
}

/**
 * @param {{[key: string]: any}[]} data 
 */
function get_keys(data) {
  return get_ordered_set(...data.map(Object.keys))
}

/**
 * @param {{[key: string]: any}[]} data 
 * @param {string[]} keys 
 * @returns {{[key:string]: number}} 
 */
function get_columns_length(data, keys = null) {
  if (!keys) {
    keys = get_keys(data)
  }

  return keys.reduce((o, key) => {
    o[key] = Math.max(key.length, ...data.map(row => (key in row) ? (('' + row[key]).length) : 0))
    return o
  }, {})
}

/**
 * @param {{[key: string]: any}[]} data 
 * @param {boolean} show_keys 
 */
function table(data, show_keys = true) {
  const columns = get_columns_length(data)

  render(data, columns, show_keys)
}

/**
 * @param {{[key: string]: any}[][]} data 
 * @param {boolean} show_keys 
 */
function multiple(data, show_keys = true) {
  const columns = get_ordered_set(...data.map(get_keys))

  const columns_length = data.reduce((o, array) => {
    const lengths = get_columns_length(array, columns)

    for (const k in lengths) {
      o[k] = Math.max(o[k] || 0, lengths[k])
    }

    return o
  }, {})

  for (const array of data) {
    render(array, columns_length, show_keys)
  }
}

module.exports = {
  table,
  multiple,
}
