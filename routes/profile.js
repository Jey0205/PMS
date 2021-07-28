var express = require('express');
var router = express.Router();
const helpers = require('../helper/util')
const bcrypt = require('bcrypt');
const salt = 5;


module.exports = function (db) {
    /* Profile */
    router.get('/', helpers.isLoggedIn,(req, res, next) => {
        res.render('../views/profile/profile', { email: req.session.user })
    })
    router.post('/', helpers.isLoggedIn,(req, res, next) => {
        
            db.query(`update users set position = $1, isfulltime = true isparttime = false where email = $2`)
    })
    router.get('/password', helpers.isLoggedIn,(req, res, next) => {
        res.render('../views/profile/password', { info: req.flash('info') })
    })
    router.post('/password', helpers.isLoggedIn, (req, res, next) => { console.log(req.body.pass1)
        db.query(`select * from users where email = $1`, [req.session.user.email], (err, data) => {
            bcrypt.compare(req.body.pass1, data.rows[0].password, (err,result) =>{
             if(err){
                 req.flash('info','Something wrong, dude!')
                 return res.redirect('/profile/password')
             }
             if(req.body.pass2 !== req.body.pass3){
                 req.flash('info', 'The password is not equal!')
                 return res.redirect('/profile/password')
             }
             if(result){
                 if(req.body.pass2 == req.body.pass3){
                     bcrypt.hash(req.body.pass2,salt, (err,hash) =>{
                         db.query('update users set password = $1, email = $2',[hash, req.session.user.email], (err,data) =>{
                             if(err){
                                 throw err
                             }
                             if(data){
                                 req.flash('info', 'Password has change')
                                 return res.redirect('/')
                             }
                         })
                       
                     })
                 }
             }
         })
        })
    })
    return router


}