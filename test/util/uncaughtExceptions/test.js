'use strict';

// TODO
// - Express app
// - Test behaviour with and without reportUncaughtExceptions enabled

var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;

var supportedVersion = require('../../../src/tracing/index').supportedVersion;
var config = require('../../config');
var utils = require('../../utils');

describe('uncaught exceptions', function() {
  if (!supportedVersion(process.versions.node)) {
    return;
  }

  var agentControls = require('../../apps/agentStubControls');
  var ServerControls = require('./apps/serverControls');

  this.timeout(config.getTestTimeout());

  agentControls.registerTestHooks();

  var serverControls = new ServerControls({
    agentControls: agentControls
  });
  serverControls.registerTestHooks();

  it('must record result of default express uncaught error function', function() {
    return serverControls.sendRequest({
      method: 'GET',
      path: '/boom',
      simple: false,
      resolveWithFullResponse: true
    })
    .then(function(response) {
      assert.fail(response, 'no response', 'Unexpected response, server should have crashed');
    })
    .catch(function(err) {
      expect(err.name).to.equal('RequestError');
      expect(err.message).to.equal('Error: socket hang up');
      return utils.retry(function() {
        return agentControls.getSpans()
        .then(function(spans) {
          utils.expectOneMatching(spans, function(span) {
            expect(span.n).to.equal('node.http.server');
            expect(span.f.e).to.equal(String(serverControls.getPid()));
            expect(span.error).to.equal(true);
            expect(span.ec).to.equal(1);
          });
        });
      });
    });
  });
});
