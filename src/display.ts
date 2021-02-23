import colors from 'colors';

function render(data: Record<string, unknown>[], columns: Record<string, number>, show_keys: boolean = true) {
  if (show_keys) {
    for (const col in columns) {
      const padding = columns[col] - col.length;
      process.stdout.write(colors.cyan(col));
      process.stdout.write(''.padStart(padding, ' '));
      process.stdout.write('   ');
    }

    process.stdout.write('\n');
  }

  for (const row of data) {
    for (const col in columns) {
      const column_length = columns[col];
      const value = `${row[col] || ''}`;

      const padding = column_length - value.length;

      process.stdout.write(`${value}`);
      process.stdout.write(''.padStart(padding, ' '));
      process.stdout.write('   ');
    }

    process.stdout.write('\n');
  }

  process.stdout.write('\n');
}

function get_ordered_set(...sets: string[][]) {
  const set = [];

  sets.forEach((array) => {
    array.forEach((item, i) => {
      if (set.indexOf(item) === -1) {
        if (i > 0) {
          const set_i = set.indexOf(array[i - 1]);
          set.splice(set_i + 1, 0, item);
        } else {
          set.push(item);
        }
      }
    });
  });

  return set;
}

function get_keys(data: Record<string, unknown>[]) {
  return get_ordered_set(...data.map(Object.keys));
}

function get_columns_length(data: Record<string, unknown>[], keys: string[] = get_keys(data)) {
  return keys.reduce<Record<string, number>>((o, key) => {
    o[key] = Math.max(key.length, ...data.map((row) => ((key in row) ? ((`${row[key]}`).length) : 0)));
    return o;
  }, {});
}

export function table(data: Record<string, unknown>[], show_keys: boolean = true) {
  const columns = get_columns_length(data);

  render(data, columns, show_keys);
}

export function multiple(data: Record<string, unknown>[][], show_keys: boolean = true) {
  const columns = get_ordered_set(...data.map(get_keys));

  const columns_length = data.reduce((o, array) => {
    const lengths = get_columns_length(array, columns);

    for (const k in lengths) {
      o[k] = Math.max(o[k] || 0, lengths[k]);
    }

    return o;
  }, {});

  for (const array of data) {
    render(array, columns_length, show_keys);
  }
}
