var express = require('express');
var router = express.Router();
const helpers = require('../helper/util')


module.exports = function (db) {
    /* Profile */
    router.get('/', helpers.isLoggedIn, function (req, res, next) {
        res.render('../views/profile/profile', { email: req.session.user })
    })
    router.post('/', helpers.isLoggedIn, function (req, res, next) {

        db.query(`update users set position = $1, isfulltime = true isparttime = false where email = $2`)
    })
    router.get('/password', helpers.isLoggedIn, function (req, res, next) {
        res.render('../views/profile/password')
    })
    router.post('/password', function (req, res, next) {
        bcrypt.hash(req.body.password, salt, function (err, hash) {
            db.query(`update users set password = $1 `, [hash], (err, data) => {
                if (err) {
                    req.flash('info', 'something wrong!')
                    return res.redirect('/password')
                }
                if (data.rows.length == 0) {
                    console.log(data.rows.length)
                    req.flash('info', 'E-Mail atau Password tidak ditemukan!')
                    return res.redirect('/pass')
                }

                bcrypt.compare(req.body.password, data.rows[0].password, function (err, result) {
                    if (result) {
                        req.session.user = data.rows[0]
                        return res.redirect('/')
                    } else {
                        req.flash('info', 'Password Salah, ulangi!')
                        return res.redirect('/login')
                    }
                });
            })

        })
    })

    return router


}