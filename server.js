var Fs, Hubot, Options, Parser, Path, Switches, adapterPath, loadScripts, robot;

require('coffee-script/register');

process.env['HUBOT_ADAPTER'] = 'irc';

process.env['PORT'] = process.env.OPENSHIFT_NODEJS_PORT;
process.env['BIND_ADDRESS'] = process.env.OPENSHIFT_NODEJS_IP;
process.env['HEROKU_URL'] = process.env.OPENSHIFT_APP_DNS;

process.env['MONGODB_USERNAME'] = process.env.OPENSHIFT_MONGODB_DB_USERNAME;
process.env['MONGODB_PASSWORD'] = process.env.OPENSHIFT_MONGODB_DB_PASSWORD;
process.env['MONGODB_HOST'] = process.env.OPENSHIFT_MONGODB_DB_HOST;
process.env['MONGODB_PORT'] = process.env.OPENSHIFT_MONGODB_DB_PORT;
process.env['MONGODB_DB'] = process.env.OPENSHIFT_APP_NAME;

process.env['HUBOT_IRC_SERVER'] = 'irc.twitch.tv';
process.env['HUBOT_IRC_PORT'] = '6667';
process.env['HUBOT_IRC_PASSWORD'] = 'oauth:ggu5l5n5saszae0t5fank3vtahqqsst';
process.env['HUBOT_IRC_ROOMS'] = '#laures1985';
process.env['HUBOT_IRC_NICK'] = 'BenevolentCoder';

Hubot = require('./node_modules/hubot/index.coffee');
Fs = require('fs');
Path = require('path');

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
loadScripts = function() {
  var data, err, externalScripts, hubotScripts, path, scripts, scriptsPath, _i, _len, _ref, _results;
  scriptsPath = Path.resolve(".", "scripts");
  robot.load(scriptsPath);
  scriptsPath = Path.resolve(".", "src", "scripts");
  robot.load(scriptsPath);
  
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
