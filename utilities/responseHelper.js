const logger = require('./logger');

module.exports = (res, result, correlationId) => {
  logger.debug({ message: 'RESPONSE', correlationId, result });
  res.json(result);
};
