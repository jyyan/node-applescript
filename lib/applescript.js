var spawn = require("child_process").spawn;
exports.Parsers = require("./applescript-parser");
var parse = exports.Parsers.parse;

// Path to 'osascript'. By default search PATH.
exports.osascript = "osascript";

// Execute a *.applescript file.
exports.execFile = function execFile(file, args, callback) {
  if (!Array.isArray(args)) {
    callback = args;
    args = [];
  }
  return runApplescript(file, args, callback);
}

// Execute a String as AppleScript.
exports.execString = function execString(str, callback) {
  return runApplescript(str, callback);
}



function runApplescript(strOrPath, args, callback) {
  var isString = false;
  if (!Array.isArray(args)) {
    callback = args;
    args = [];
    isString = true;
  }

  // args get added to the end of the args array
  if (!isString) {
    // The name of the file is the final arg if 'execFile' was called.
    // fix for exec File with args call
    args.unshift(strOrPath);
  } else {
    /*
     using -e statement option, for execString call
     ref: man page of osascript:
      -e statement
           Enter one line of a script.  If -e is given, osascript will not look for a
           filename in the argument list.  Multiple -e options may be given to build
           up a multi-line script.  Because most scripts use characters that are spe-
             cial to many shell programs (for example, AppleScript uses single and dou-
             ble quote marks, ``('', ``)'', and ``*''), the statement will have to be
           correctly quoted and escaped to get it past the shell intact.
     */
    args.push('-e');
    args.push(strOrPath);
  }
  // make -ss is the first item of the args
  // so it would become :
  //   case execFile:
  //     osascript -ss ./FilePath arg1 arg2 ...
  //   case execString:
  //     osascript -ss -e ScriptString
  args.unshift("-ss"); // To output machine-readable text.

  // console.log('call osascript with args = ', args);
  var interpreter = spawn(exports.osascript, args);

  bufferBody(interpreter.stdout);
  bufferBody(interpreter.stderr);

  interpreter.on('exit', function(code) {
    var result = parse(interpreter.stdout.body);
    var err;
    if (code) {
      // If the exit code was something other than 0, we're gonna
      // return an Error object.
      err = new Error(interpreter.stderr.body);
      err.appleScript = strOrPath;
      err.exitCode = code;
    }
    if (callback) {
      callback(err, result, interpreter.stderr.body);
    }
  });

  /*
  if (isString) {
    // Write the given applescript String to stdin if 'execString' was called.
    interpreter.stdin.write(strOrPath);
    interpreter.stdin.end();
  }
  */
}

function bufferBody(stream) {
  stream.body = "";
  stream.setEncoding("utf8");
  stream.on("data", function(chunk) { stream.body += chunk; });
}
