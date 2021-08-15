var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const session = require('express-session');
const salt = 5;




module.exports = function (db) {
  /* GET home page. */
  router.get('/', function (req, res, next) {
    res.render('../views/login/login', { info: req.flash('info') });
  });
  router.post('/', function (req, res, next) {
    db.query(`select * from users where email = $1`, [req.body.email], (err, data) => {
      if (err) {
        req.flash('info', 'something wrong!')
        return res.redirect('/login')
      }
      if (data.rows.length == 0) {
        req.flash('info', "You dumb or what? there's nothing like that in this site!!")
        return res.redirect('/login')
      }

      bcrypt.compare(req.body.password, data.rows[0].password, function (err, result) {
        if (result) {
          req.session.user = data.rows[0]
          req.flash('success', `Welcome ${req.session.user.firstname} ${req.session.user.lastname}`)
          return res.redirect('/')
        } else {
          req.flash('info', 'You forgot your password? Such a Dumbass you are!!')
          return res.redirect('/login')
        }
      });
    })

  })

  /* GET register page. */
  router.get('/register', function (req, res, next) {
    res.render('../views/login/register', { title: 'Express' });
  });
  router.post('/register', function (req, res, next) {
    bcrypt.hash(req.body.password, salt, function (err, hash) {
      db.query(`insert into users(email, password,firstname,lastname) values ('${req.body.email}','${hash}','${req.body.firstname}','${req.body.lastname}')`, [])
        .then(res.redirect('/login'))
        .catch(e => console.error(e));
    })
  });


  return router;
}