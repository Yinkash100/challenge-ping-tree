const fs = require('fs')
const path = require('path')

module.exports = fileWriteSync

function fileWriteSync (opts) {
  try {
    fs.writeFileSync(path.resolve(opts.dir, opts.fileName), typeof opts.data === 'object' ? JSON.stringify(opts.data) : opts.data)
    // file written successfully
  } catch (err) {
    console.error(err)
  }
}
