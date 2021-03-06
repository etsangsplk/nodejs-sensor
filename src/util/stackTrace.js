'use strict';

// See v8 Error API docs at
// https://github.com/v8/v8/wiki/Stack%20Trace%20API

exports.captureStackTrace = function captureStackTrace(length, referenceFunction) {
  if (length <= 0) {
    return [];
  }

  referenceFunction = referenceFunction || captureStackTrace;
  var originalLimit = Error.stackTraceLimit;
  var originalPrepareStackTrace = Error.prepareStackTrace;
  Error.stackTraceLimit = length;
  Error.prepareStackTrace = jsonPrepareStackTrace;
  var stackTraceTarget = {};
  Error.captureStackTrace(stackTraceTarget, referenceFunction);
  var stack = stackTraceTarget.stack;
  Error.stackTraceLimit = originalLimit;
  Error.prepareStackTrace = originalPrepareStackTrace;

  return stack;
};


function jsonPrepareStackTrace(error, structuredStackTrace) {
  var len = structuredStackTrace.length;
  var result = new Array(len);

  for (var i = 0; i < len; i++) {
    var callSite = structuredStackTrace[i];
    result[i] = {
      m: exports.buildFunctionIdentifier(callSite),
      c: callSite.getFileName() || undefined,
      n: callSite.getLineNumber() || undefined
    };
  }

  return result;
}


exports.buildFunctionIdentifier = function buildFunctionIdentifier(callSite) {
  if (callSite.isConstructor()) {
    return 'new ' + callSite.getFunctionName();
  }

  var name;
  var methodName = callSite.getMethodName();
  var functionName = callSite.getFunctionName();
  var type = callSite.getTypeName();

  if (!methodName && !functionName) {
    return '<anonymous>';
  } else if ((functionName && !methodName) || (!functionName && methodName)) {
    name = functionName || methodName;
    if (type) {
      return type + '.' + name;
    }
    return name;
  } else if (functionName === methodName) {
    if (type) {
      return type + '.' + functionName;
    }
    return functionName;
  }

  var label = '';
  if (type) {
    label += type + '.';
  }
  label += functionName;
  label += ' [as ' + methodName + ']';
  return label;
};
