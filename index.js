#!/usr/bin/env node

/*!
 * Apache RewriteRule collision validation.
 *
 * Usage:
 *
 *   apache-validate-rewrites filename [,filename, ...]
 *
 * @version 0.0.5
 * @author Anders Evenrud <andersevenrud@gmail.com>
 * @license MIT
 */
const _fs = require('fs');
const _util = require('util');
const _path = require('path');

/*
 * Checks for collisions
 */
function validateCollisions(lines) {
  const failed = [];
  const filtered = lines.filter((iter) => {
    return iter.destination.substr(-1) !== '$';
  });

  filtered.forEach((iter) => {
    filtered.some((iiter) => {
      if ( iter.index < iiter.index ) {
        const test = iiter.source.substr(0, iter.source.length);
        if ( test === iter.source && iter.options.indexOf('L') !== -1 ) {
          const msg = ['Redirect',
                      _util.format('%d:\x1b[1m%s\x1b[0m', iter.index, iter.source),
                      'overrides',
                      _util.format('%d:\x1b[1m%s\x1b[0m', iiter.index, iiter.source)];

          failed.push(msg.join(' '));
          return true;
        }
      }
      return false;
    });
  });

  return failed ? Promise.reject(failed) : Promise.resolve();
}

/*
 * Reads out all RewriteRule entries in the file
 * and runs a validation function.
 */
function validate(filePath) {
  return (new Promise((resolve, reject) => {
    _fs.readFile(filePath, (err, res) => {
      err ? reject(err) : resolve(res);
    });
  })).then((bin) => {
    const lines = bin.toString().split('\n');
    return Promise.resolve(lines.map((line, idx) => {
      const re = /^RewriteRule\s/;
      const isrr = line.match(re);
      const parts = isrr ? line.replace(re, '').replace(/\s+/, ' ').split(/ /) : [];

      return Object.freeze({
        index: idx + 1,
        source: (parts[0] || '').replace(/^"/, '').replace(/"$/, ''),
        destination: (parts[1] || '').replace(/^"/, '').replace(/"$/, ''),
        options: (parts[2] || '').replace(/[\]\[\s]/g, '').toUpperCase().split(','),
        line: line
      });
    }).filter((iter) => {
      return !!iter.source && !!iter.destination;
    }));
  }).then(validateCollisions);
}

//
// MAIN
//
process.argv.slice(2).forEach((val) => {

  validate(val).then(() => {
    console.log(val, 'OK');
  }).catch((failed) => {
    if ( failed instanceof Array ) {
      const msg = _util.format('\x1b[31m%s:\x1b[0m %s', 'Failed rules', failed.length, 'in', val);
      console.error(msg);

      failed.forEach((msg) => {
        console.log(msg);
      });
    } else {
      console.error(failed);
    }

    process.exit(1);
  });

});

