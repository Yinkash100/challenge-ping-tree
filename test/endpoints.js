process.env.NODE_ENV = 'test'
const test = require('ava')
const servertest = require('servertest')
const { BufferListStream } = require('bl')
const path = require('path')
const fs = require('fs')

const server = require('../lib/server')
const fileWriteSync = require('../lib/fileWriteSync')
const { content, contentNegative, contentNotPresent } = require('../lib/constants/testContants')
const { POST_TARGET, GET_TARGET, ROUTE } = require('../lib/constants/urlContants')

const fileData = [content, contentNegative, contentNotPresent]

const files = ['content', 'contentNegative', 'contentNotPresent']

files.forEach((element, index) => {
  const dirPath = path.resolve(__dirname, 'test-data')
  const opts = {
    dir: dirPath,
    fileName: `${element}.json`,
    data: fileData[index]
  }
  fileWriteSync(opts)
})

// Common function to test using serverStream
function testPostMethod (details, t) {
  const { url, method, fileName, testData } = details
  const dirPath = path.resolve(__dirname, 'test-data')
  const serverStream = servertest(server(), url, { method })
  fs.createReadStream(path.resolve(dirPath, fileName), 'UTF-8').pipe(serverStream)
  serverStream.pipe(BufferListStream(function (err, data) {
    t.falsy(err, 'no error')

    const res = JSON.parse(data.toString())
    testData.forEach(element => {
      t.is(res[element.field], element.data, element.message)
    })
    t.end()
  }))
}

test.serial.cb('healthcheck', function (t) {
  const url = '/health'
  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.status, 'OK', 'status is ok')
    t.end()
  })
})

test.serial.cb('Create Target', function (t) {
  const details = {
    url: POST_TARGET,
    method: 'POST',
    fileName: 'target_data.json',
    testData: [
      { field: 'message', data: 'Target created successfully', message: 'Target created successfully' }
    ]
  }
  testPostMethod(details, t)
})

test.serial.cb('Create Target Already Exists', function (t) {
  const details = {
    url: POST_TARGET,
    method: 'POST',
    fileName: 'target_data.json',
    testData: [
      { field: 'message', data: 'Error creating target', message: 'Error creating target' }
    ]
  }
  testPostMethod(details, t)
})

test.serial.cb('Create Target id not present in post data', function (t) {
  const details = {
    url: POST_TARGET,
    method: 'POST',
    fileName: 'target_no_id_data.json',
    testData: [
      { field: 'message', data: 'Cannot create target, target id required', message: 'Cannot create target, target id required' }
    ]
  }
  testPostMethod(details, t)
})

test.serial.cb('get Target id 1', function (t) {
  const url = GET_TARGET + '1'
  servertest(server(), url, { encoding: 'json' }, function (error, res) {
    t.falsy(error, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.data.id, '1', 'Id is 1')
    t.end()
  })
})

test.serial.cb('get Target id does not exist', function (t) {
  const url = GET_TARGET + '2'
  servertest(server(), url, { encoding: 'json' }, function (error, res) {
    t.falsy(error, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.message, 'Cannot get target, Target not found', 'Cannot get target, Target not found')
    t.end()
  })
})

test.serial.cb('Get all targets', function (t) {
  const url = POST_TARGET
  servertest(server(), url, { encoding: 'json' }, function (error, res) {
    t.falsy(error, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.data.length, 1, 'total is 1')
    t.end()
  })
})

test.serial.cb('update Target', function (t) {
  const details = {
    url: GET_TARGET + '1',
    method: 'POST',
    fileName: 'update_target_data.json',
    testData: [
      { field: 'message', data: 'Target updated successfully', message: 'Target updated successfully' }
    ]
  }
  testPostMethod(details, t)
})

test.serial.cb('update Target which does not exist', function (t) {
  const details = {
    url: GET_TARGET + '2',
    method: 'POST',
    fileName: 'update_target_data.json',
    testData: [
      { field: 'message', data: 'Cannot update target, Target not found', message: 'Cannot update target, Target not found' }
    ]
  }
  testPostMethod(details, t)
})

test.serial.cb('positive route Target', function (t) {
  const details = {
    url: ROUTE,
    method: 'POST',
    fileName: 'content.json',
    testData: [
      { field: 'url', data: 'http://example.com', message: 'Valid url' }
    ]
  }
  testPostMethod(details, t)
})

test.serial.cb('positive route Target second time to return decision reject ', function (t) {
  const details = {
    url: ROUTE,
    method: 'POST',
    fileName: 'content.json',
    testData: [
      { field: 'decision', data: 'reject', message: 'Decision is rejected' }
    ]
  }
  testPostMethod(details, t)
})

test.serial.cb('route Target decision reject', function (t) {
  const details = {
    url: ROUTE,
    method: 'POST',
    fileName: 'contentNegative.json',
    testData: [
      { field: 'decision', data: 'reject', message: 'Decision is rejected' }
    ]
  }
  testPostMethod(details, t)
})

test.serial.cb('route Target not present in redis store', function (t) {
  const details = {
    url: ROUTE,
    method: 'POST',
    fileName: 'contentNotPresent.json',
    testData: [
      { field: 'decision', data: 'reject', message: 'Decision is rejected' }
    ]
  }
  testPostMethod(details, t)
})
