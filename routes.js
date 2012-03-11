var express = require('express'),
    app     = module.exports = express.createServer(),
    PORT    = process.env.PORT || 8080;

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler({ showStack: true }));
});

// Routes

app.get('/', function(req, res){
  res.render('index', {
    locals: {
      title: 'Ready, Set, Art!'
    },
    layout: false
  });
});

app.listen(PORT);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

exports.app = app;
