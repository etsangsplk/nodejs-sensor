'use strict';

var logger = require('../logger').getLogger('uncaughtExceptionHandler');
var cls = require('../tracing/cls');

var uncaughtExceptionEventName = 'uncaughtException';
var warningHasBeenLogged = false;
var config;


exports.init = function(_config) {
  config = _config;
  setDefaults();
};


function setDefaults() {
  // TODO Document config option
  config.reportUncaughtException = config.reportUncaughtException === true;
}


exports.activate = function() {
  if (config.reportUncaughtException) {
    if (!warningHasBeenLogged) {
      logger.info('Reporting uncaught exceptions is enabled. Note that this ' +
        'can alter the behaviour of your application. See documentation for ' +
        'details.');
      warningHasBeenLogged = true;
    }
    process.once(uncaughtExceptionEventName, onUncaughtException);
  }
};


exports.deactivate = function() {
  process.removeListener(uncaughtExceptionEventName, onUncaughtException);
};


function onUncaughtException(err) {
  finishCurrentSpan(logAndRethrow.bind(null, err));
}


function finishCurrentSpan(cb) {
  var currentSpan = cls.getCurrentSpan();
  if (!currentSpan) {
    return cb();
  }
  // TODO Differentiate between entry and exit, currently assumes this is an entry
  currentSpan.error = true;
  currentSpan.ec = 1;
  currentSpan.d = Date.now() - currentSpan.ts;
  currentSpan.transmit();
  // TODO Give the span some time to be transmitted. Needs to be improved, send immediately and wait for it.
  setTimeout(function() {
    cb();
  }, 2000);

  // TODO I think we should also send an event, something along the lines of
  // agentConnection.sendDataToAgent({
  //   event: 'Node.js uncaught exception.',
  //   error: err
  // }, function() {
}


function logAndRethrow(err) {
  // Remove all listeners now, so the final throw err won't trigger other registered listeners a second time.
  var registeredListeners = process.listeners(uncaughtExceptionEventName);
  if (registeredListeners) {
    registeredListeners.forEach(function(listener) {
      process.removeListener(uncaughtExceptionEventName, listener);
    });
  }
  // eslint-disable-next-line max-len
  logger.error('The Instana Node.js sensor caught an otherwise uncaught exception to generate a respective Instana event for you. This means that you have configured Instana to do just that by setting reportUncaughtException (reporting uncaught exceptions is opt-in). Instana will now rethrow the error to terminate this process, otherwise the application would be left in an inconsistent state, see https://nodejs.org/api/process.html#process_warning_using_uncaughtexception_correctly. The next line on stderr will look as if Instana crashed your application, but actually the original error came from your application code, not from Instana. Since we rethrow the original error, you should see its stacktrace below (depening on how you operate your application and how logging is configured.)');

  // Rethrow the original error (after notifying the agent) to trigger the process to finally terminate - Node won't
  // run this handler again since it (a) has been registered with `once` and (b) we removed all handlers for
  // uncaughtException anyway.
  throw err;
}


