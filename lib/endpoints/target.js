const sendJson = require('send-data/json')

const redis = require('../redis')

module.exports = {
  createTarget,
  getTargets,
  getTargetById,
  routeToTarget,
  updateTargetById
}

function createTarget (req, res, opts, onError) {
  const reqBody = opts.body
  if (reqBody && reqBody.id) {
    redis.hset('targets', reqBody.id, JSON.stringify(reqBody), function (err, result) {
      if (err) onError(err)

      if (result) {
        sendJson(req, res, { message: 'Target created successfully' })
      } else {
        sendJson(req, res, { message: 'Error creating target' })
      }
    })
  } else {
    sendJson(req, res, { message: 'Cannot create target, target id required' })
  }
}

function getBestTarget (targets, timestamp) {
  return new Promise((resolve, reject) => {
    const requestDate = getDayString(timestamp)
    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]
      // update daily record show that current target has accepted one request
      redis.hget(`requestCount-${requestDate}`, target.id, function (err, dailyRequestCount) {
        if (err) console.log(err)

        let recordInfo = {}
        if (dailyRequestCount) {
          if (target.maxAcceptsPerDay <= dailyRequestCount) return
          recordInfo = {
            numAcceptedRequests: dailyRequestCount.numAcceptedRequests + 1
          }
        } else {
          if (target.maxAcceptsPerDay <= 0) return
          recordInfo = {
            numAcceptedRequests: 1
          }
        }
        redis.hset(`requestCount-${requestDate}`, target.id, JSON.stringify(recordInfo), function (err, targetDailyRequestCount) {
          if (err) reject(err)

          if (targetDailyRequestCount) resolve(target.url)
        })
      })
    }
  })
}

function getDayString (timeStamp) {
  return `${new Date(timeStamp).getUTCFullYear()}-${new Date(timeStamp).getUTCMonth() + 1}-${new Date(timeStamp).getUTCDate()}`
}
function getTargets (req, res, opts, onError) {
  redis.hgetall('targets', function (err, result) {
    if (err) onError(err)

    if (result) {
      const targets = Object.keys(result).map((key) =>
        JSON.parse(result[key]))
      sendJson(req, res, { data: targets })
    } else {
      sendJson(req, res, { message: 'You havent created a target' })
    }
  })
}

function getTargetById (req, res, opts, onError) {
  const targetId = opts.params.id

  if (!targetId || targetId.toString().trim() === '') {
    sendJson(req, res, { message: 'Cannot get target, Target id missing' })
  }

  redis.hget('targets', targetId, function (err, result) {
    if (err) onError(err)

    if (result) {
      sendJson(req, res, { data: JSON.parse(result) })
    } else {
      sendJson(req, res, { message: 'Cannot get target, Target not found' })
    }
  })
}

function updateTargetById (req, res, opts, onError) {
  const targetId = opts.params.id

  redis.hget('targets', targetId, function (err, result) {
    if (err) onError(err)

    if (result) {
      const doc = JSON.parse(result)
      const newDoc = { ...doc, ...opts.body }
      redis.hset('targets', targetId, JSON.stringify(newDoc), function (err, result) {
        if (err) onError(err)

        if (!result) {
          sendJson(req, res, { message: 'Target updated successfully' })
        } else {
          sendJson(req, res, { message: 'Error updating target' })
        }
      })
    } else {
      sendJson(req, res, { message: 'Cannot update target, Target not found' })
    }
  })
}

function routeToTarget (req, res, opts, onError) {
  const { body } = opts
  const { geoState, timestamp } = body

  redis.hgetall('targets', function (err, result) {
    if (err) onError(err)

    if (result) {
      let targets = Object.keys(result).map((key) =>
        JSON.parse(result[key]))

      if (geoState && geoState.trim() === '') {
        targets = targets.filter(target =>
          target.accept.geoState.$in.include(geoState))
      }
      if (timestamp && timestamp.trim() === '') {
        const requestHour = new Date(new Date(timestamp).toUTCString()).getUTCHours()
        targets = targets.filter(target => target.accept.hour.$in.include(requestHour.toString()))
      }

      if (timestamp.length === 0) sendJson(req, res, { decision: 'reject' })

      targets.sort((a, b) =>
        parseInt(b.maxAcceptsPerDay) - parseInt(a.maxAcceptsPerDay)
      )

      getBestTarget(targets, timestamp)
        .then((url) => {
          sendJson(req, res, { url })
        })
        .catch((err) => {
          onError(err)
        })
    } else {
      sendJson(req, res, { message: 'You havent created a target' })
    }
  })
}
