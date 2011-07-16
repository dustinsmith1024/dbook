var sys = require('sys');
var exec = require("child_process").exec;
var os = require('os');
var fs = require('fs');
var express = require('express');
var app = express.createServer();
var io = require('socket.io');
var _ = require('underscore')._;

app.configure(function(){
    app.use(express.methodOverride());
    app.use(express.logger());
    app.use(express.bodyParser());
    app.use(app.router);
});

app.configure('development', function(){
    app.use(express.static(__dirname + '/public'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  var oneYear = 31557600000;
  app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
  app.use(express.errorHandler());
});

app.get('/', function(req, res){
  console.log("/ requested");
  fs.readFile(__dirname + '/public/index.html', 'utf8', function(err, text){
      res.send(text);
  });
});

var port = parseInt(process.env.PORT) || 3000;
app.listen(port);
io = io.listen(app);
io.sockets.on('connection', function (socket) {
  socket.on('savedStep!', function(data){
    console.log("Save Player to DB or File");  //DO SOME DB STUFF OR SOMETHING
  });
});

/* EXAMPLES FROM WORK BELOW
var preWrap = _.template('<pre class="command"><code><%= contents %></code></pre>');
var hostname = function (callback){
  callback(null, os.hostname());
}
var passengerMem = function(callback) {
  exec('passenger-status',
    function (error, stdout, stderr) {
    if(error === null){
      exec('passenger-memory-stats',
        function (error2, stdout2, stderr2) {
          callback(null, preWrap({contents : stdout + "\n" + stdout2}));
          console.log('stderr: ' + stderr);
          if (error !== null) {
            console.log('exec error: ' + error);
          }
      });
    }
  });
}
var db = function (callback) {
  exec('mysqlshow -uroot -pcerner fitness_production --status',
    function (error, stdout, stderr) {
      callback(null, preWrap({contents : stdout.replace(/\n/gi,'<br/>').replace('/\s/gi','&nbsp;')}));
      console.log('stderr: ' + stderr);
      if (error !== null) {
        console.log('exec error: ' + error);
      }
  });
}
var df = function (callback) {
  exec('df -hP',
    function (error, stdout, stderr) {
      callback(null, preWrap({contents : stdout.replace(/\n/gi,'<br/>')}));
      console.log('stderr: ' + stderr);
      if (error !== null) {
        console.log('exec error: ' + error);
      }
  });
}

var example = function (data, callback){
  var timeout = Math.ceil(data);
  console.log(timeout);
  setTimeout(function(){
    callback(null, data);
  }, timeout);
}

app.get('/tablespace', function(req, res){
  db(function(err, data){
    res.send(data);
  });
});

app.get('/hostname', function(req, res){
  hostname(function(err, data){
    res.send("Hostname is " + data);
  });
});

app.get('/diskspace', function(req, res){
  df(function(err, data){
    res.send(data);
  });
});

app.get('/rails-memory', function(req, res){
  passengerMem(function(err, data){
    res.send(data);
  });
});

app.listen(3000);
io = io.listen(app);
io.sockets.on('connection', function (socket) {
  socket.on('savedStep!', function(data){
    console.log("Save Player to DB or File");  //DO SOME DB STUFF OR SOMETHING
  });
});
*/
