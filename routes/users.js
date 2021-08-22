var express = require('express');
var router = express.Router();
const helpers = require('../helper/util');
const bcrypt = require('bcrypt');
const salt = 5;


module.exports = function (db) {

    router.get('/', helpers.isAdmin, helpers.isLoggedIn, (req, res, next) => {
        const url = req.url == "/users" ? "/users?page=1" : req.url;
        const page = parseInt(req.query.page) || 1;
        const limitTab = 3
        let offset = (page - 1) * limitTab;
        let userid = req.query.userid
        let name = req.query.name
        let position = req.query.position
        let params = []
        let basename = 'Users'

        if (userid) {
            params.push(`userid = ${userid}`)
        }
        if (name) {
            params.push(`firstname || lastname ilike '%${name}%'`)
        }
        if (position) {
            params.push(`position = '${position}'`)
        }

        let querys = `select * from users order by userid limit ${limitTab} offset ${offset}`

        let queryCount = `select count (*) as total from users`

        if (params.length > 0) {
            querys = `select * from users `;
            queryCount = `select count (*) as total from users `;

            querys += `where ${params.join(" and ")} order by userid limit ${limitTab} offset ${offset}`

            queryCount += `where ${params.join(" and ")}`
        }
        db.query(queryCount, (err, result) => {
            if (err) {
                throw err
            }
            let total = result.rows[0].total;
            let pages = Math.ceil(total / limitTab);
            db.query(querys, (err, data) => {
                console.log(data.rows);
                if (err) {
                    throw err;
                }
                db.query(
                    "select optionusers from users where userid = $1", [req.session.user.userid], (err, option) => {
                        if (err) {
                            throw err;
                        }
                        res.render('../views/users/users', {
                            data: data.rows,
                            optionusers: option.rows[0].optionusers,
                            userid,
                            name,
                            position,
                            pages,
                            page,
                            url,
                            session: req.session.user,
                            info: req.flash('info'),
                            success: req.flash('success'),
                            base: basename,
                        })
                    })
            });
        });
    });

    router.post('/', helpers.isAdmin, helpers.isLoggedIn, (req, res, next) => {
        db.query('update users set optionusers = $1 where userid = $2', [req.body, req.session.user.userid])
            .then(res.redirect(`/users`))
            .catch(e => { throw e })
    });


    router.get('/add', helpers.isLoggedIn, helpers.isAdmin, (req, res, next) => {
        let basename = 'Add User'
        res.render('../views/users/add', { base: basename, session: req.session.user })
    })

    router.post('/add', helpers.isLoggedIn, helpers.isAdmin, (req, res, next) => {
        bcrypt.hash(req.body.password, salt, (err, hash) => {
            db.query(`insert into users(email,password,firstname,lastname,position,option,optionmem,optionisu,optionusers,role) values ('${req.body.email}','${hash}','${req.body.firstname}','${req.body.lastname}','${req.body.position}','${req.body.option}','${req.body.optionmem}','${req.body.optionisu}','${req.body.optionusers}','${req.body.role}')`, (err) => {
                if (err) {
                    throw err
                }
                req.flash('success', 'Data has been stored!')
                res.redirect('/users')
            })

        })
    });


    router.get('/edit/:userid', helpers.isLoggedIn, helpers.isAdmin, (req, res, next) => {
        let basename = 'Edit User'
        const userid = req.params.userid
        db.query('select * from users where userid = $1', [userid], (err, nama) => {
            console.log(userid)
            if (err) {
                throw err
            }
            res.render('../views/users/edit', {
                nama: nama.rows[0],
                base: basename, 
                session: req.session.user,
                userid
            })
        })
    })

    router.post('/edit/:userid', helpers.isLoggedIn, helpers.isAdmin, (req, res, next) => {
        const userid = req.params.userid
        db.query('update users set email = $1, firstname = $2, lastname = $3 where userid = $4', [req.body.email, req.body.firstname, req.body.lastname,userid], (err) => {
            if (err) {
                throw err
            }
            req.flash('success', 'Data has been update')
            res.redirect('/users')
        })
    });





    return router
}