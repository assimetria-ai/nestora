// @custom repositories — product-specific database repositories
// Add your custom repos here and export them.
// This file is NEVER overwritten during template sync.
//
// Example:
// const ProjectRepo = require('./ProjectRepo')
// module.exports = { ProjectRepo }

const ApiKeyRepo = require('./ApiKeyRepo')
const BrandRepo = require('./BrandRepo')
const CollaboratorRepo = require('./CollaboratorRepo')
const ErrorEventRepo = require('./ErrorEventRepo')
const UserRepo = require('./UserRepo')

module.exports = { ApiKeyRepo, BrandRepo, CollaboratorRepo, ErrorEventRepo, UserRepo }
