const systemInfo = require('../@system/info')

const customInfo = {
  name: 'Nestora',
  url: process.env.APP_URL ?? 'https://nestora.com',
  description: 'Smart property management. Find your somewhere.',
}

module.exports = { ...systemInfo, ...customInfo }
