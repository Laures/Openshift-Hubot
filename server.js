var Fs, Hubot, Options, Parser, Path, Switches, adapterPath, loadScripts, robot;

// prepare node to require .coffe files
require('coffee-script/register');

// configure logging with winston
var winston = require('winston');

function formatArgs(args){
    return [util.format.apply(util.format, Array.prototype.slice.call(args))];
}

// send all console log calls to winston
console.log = function(){
    logger.info.apply(logger, formatArgs(arguments));
};
console.info = function(){
    logger.info.apply(logger, formatArgs(arguments));
};
console.warn = function(){
    logger.warn.apply(logger, formatArgs(arguments));
};
console.error = function(){
    logger.error.apply(logger, formatArgs(arguments));
};
console.debug = function(){
    logger.debug.apply(logger, formatArgs(arguments));
};

// external log aggregators
// splunk
//winston.add(require('winston-splunk').splunk, {splunkHost: "udp-8bki-4w42.data.splunkstorm.com", splunkPort: "31118"});

// loggly
//require('winston-loggly');
//winston.add(winston.transports.Loggly, {subdomain: "laures", inputToken: "fe10e840-d7e7-4569-8262-8cc544dc473c", tags: ["NodeJS"], json:true});

// logentries
//require('winston-logentries');
//winston.add(winston.transports.Logentries, {token: '7f8a8349-c7df-47c9-bd37-4f715423f849'});

logger = new winston.Logger();
winston.info('Starting up Hubot');

// configure irc adapter (this needs to be done in the environment
process.env['HUBOT_ADAPTER'] = 'irc';
process.env['HUBOT_IRC_SERVER'] = 'irc.twitch.tv';
process.env['HUBOT_IRC_PORT'] = '6667';
process.env['HUBOT_IRC_PASSWORD'] = 'oauth:ggu5l5n5saszae0t5fank3vtahqqsst';
process.env['HUBOT_IRC_ROOMS'] = '#laures1985';
process.env['HUBOT_IRC_NICK'] = 'BenevolentCoder';

// translate openshift env variables to variables expected by hubot and hubot scripts
// basics
process.env['PORT'] = process.env.OPENSHIFT_NODEJS_PORT;
process.env['BIND_ADDRESS'] = process.env.OPENSHIFT_NODEJS_IP;
process.env['HEROKU_URL'] = process.env.OPENSHIFT_APP_DNS;

// monbo-brain variables
process.env['MONGODB_USERNAME'] = process.env.OPENSHIFT_MONGODB_DB_USERNAME;
process.env['MONGODB_PASSWORD'] = process.env.OPENSHIFT_MONGODB_DB_PASSWORD;
process.env['MONGODB_HOST'] = process.env.OPENSHIFT_MONGODB_DB_HOST;
process.env['MONGODB_PORT'] = process.env.OPENSHIFT_MONGODB_DB_PORT;
process.env['MONGODB_DB'] = process.env.OPENSHIFT_APP_NAME;

Hubot = require('./node_modules/hubot/index.coffee');
Fs = require('fs');
Path = require('path');

// Hubot default settings
Options = {
  adapter: process.env.HUBOT_ADAPTER || "shell",
  alias: process.env.HUBOT_ALIAS || false,
  create: process.env.HUBOT_CREATE || false,
  enableHttpd: process.env.HUBOT_HTTPD || true,
  scripts: process.env.HUBOT_SCRIPTS || [],
  name: process.env.HUBOT_NAME || "Hubot",
  path: process.env.HUBOT_PATH || ".",
  configCheck: false
};

if (process.platform !== "win32") {
  process.on('SIGTERM', function() {
    return process.exit(0);
  });
}

adapterPath = Path.join(__dirname, ".", "node_modules/hubot/src", "adapters");
robot = Hubot.loadBot(adapterPath, Options.adapter, Options.enableHttpd, Options.name);
robot.alias = Options.alias;

// all hubot scripts
loadScripts = function() {
  var data, err, externalScripts, hubotScripts, path, scripts, scriptsPath, _i, _len, _ref, _results;
  
  // all scripts from the script path
  scriptsPath = Path.resolve(".", "scripts");
  robot.load(scriptsPath);
  scriptsPath = Path.resolve(".", "src", "scripts");
  robot.load(scriptsPath);
  
  // scripts to load from the hubot-scripts package
  hubotScripts = Path.resolve(".", "hubot-scripts.json");
  if (Fs.existsSync(hubotScripts)) {
    data = Fs.readFileSync(hubotScripts);
    if (data.length > 0) {
      try {
        scripts = JSON.parse(data);
        scriptsPath = Path.resolve("node_modules", "hubot-scripts", "src", "scripts");
        robot.loadHubotScripts(scriptsPath, scripts);
      } catch (_error) {
        err = _error;
        console.error("Error parsing JSON data from hubot-scripts.json: " + err);
        process.exit(1);
      }
    }
  }

  // scripts to load from different packages
  externalScripts = Path.resolve(".", "external-scripts.json");
  if (Fs.existsSync(externalScripts)) {
    Fs.readFile(externalScripts, function(err, data) {
      if (data.length > 0) {
        try {
          scripts = JSON.parse(data);
        } catch (_error) {
          err = _error;
          console.error("Error parsing JSON data from external-scripts.json: " + err);
          process.exit(1);
        }
        return robot.loadExternalScripts(scripts);
      }
    });
  }
  
  // scripts to load as configured by the environment
  _ref = Options.scripts;
  _results = [];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    path = _ref[_i];
    if (path[0] === '/') {
      scriptsPath = path;
    } else {
      scriptsPath = Path.resolve(".", path);
    }
    _results.push(robot.load(scriptsPath));
  }
  return _results;
};

robot.adapter.on('connected', loadScripts);
robot.run();
