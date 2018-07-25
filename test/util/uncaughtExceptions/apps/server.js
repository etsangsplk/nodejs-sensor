'use strict';

// Deliberately not using Express.js here to avoid conflicts with Express.js' uncaught error handling.

require('../../../..')({
  agentPort: process.env.AGENT_PORT,
  level: 'info',
  tracing: {
    forceTransmissionStartingAt: 1
  },
  reportUncaughtException: true
});

var http = require('http');
var port = process.env.APP_PORT;

var requestHandler = function(request, response) {
  if (request.url === '/') {
    return success(response);
  } else if (request.url === '/boom') {
    return uncaughtError(response);
  } else {
    response.statusCode = 404;
    return response.end('Not here :-(');
  }
};

function success(response) {
  setTimeout(function() {
    response.end('Everything\'s peachy.');
  }, 100);
}

function uncaughtError() {
  setTimeout(function() {
    throw new Error('Boom');
  }, 100);
}

var server = http.createServer(requestHandler);

server.listen(port, function(err) {
  if (err) {
    // eslint-disable-next-line no-console
    return console.log('something bad happened', err);
  }

  // eslint-disable-next-line no-console
  console.log('server is listening on ' + port);
});
