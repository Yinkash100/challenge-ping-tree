module.exports = {
  content: {
    geoState: 'ca',
    publisher: 'abc',
    timestamp: new Date().toUTCString().replace(new Date(new Date().toUTCString()).getUTCHours(), 13)
  },
  contentNegative: {
    geoState: 'ca',
    publisher: 'abc',
    timestamp: new Date().toUTCString().replace(new Date(new Date().toUTCString()).getUTCHours(), 23)
  },
  contentNotPresent: {
    geoState: 'nh',
    publisher: 'abc',
    timestamp: new Date().toUTCString().replace(new Date(new Date().toUTCString()).getUTCHours(), 23)
  }

}
