var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session')
var flash = require('connect-flash');
const fileUpload = require('express-fileupload');

const productionDB = {
  user: 'hekpfqrstmmspw',
  host: 'ec2-34-194-14-176.compute-1.amazonaws.com',
  database: 'deakdtfl14mmvo',
  password: '27ac1d537c6dfb126ce7e2f465624d0649e45e8768f773ba9866c73790bfa6f5',
  port: 5432,
  ssl: {rejectUnauthorized: false}
}


const developmentDB = {
  user: 'postgres',
  host: 'localhost',
  database: 'pmsDB',
  password: '12345',
  port: 5432
}

const isDevelopment = false
const { Pool } = require('pg')
let pool = null
if (isDevelopment) {
  pool = new Pool(productionDB)
} else {
  pool = new Pool(developmentDB)
}


var indexRouter = require('./routes/index')(pool);
var loginRouter = require('./routes/login')(pool);
var profileRouter = require('./routes/profile')(pool);
var projectRouter = require('./routes/project')(pool);
var issuesRouter = require('./routes/issues')(pool);
var usersRouter = require('./routes/users')(pool)

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'fajar'
}))
app.use(flash());
app.use(fileUpload());

app.use('/', indexRouter);
app.use('/login', loginRouter);
app.use('/profile', profileRouter);
app.use('/project', projectRouter);
app.use('/issues', issuesRouter);
app.use('/users', usersRouter)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
