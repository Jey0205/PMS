var express = require('express');
var router = express.Router();
const helpers = require('../helper/util')


module.exports = function (db) {
    /*PROJECT*/
    router.get('/AddProject', helpers.isLoggedIn, function (req, res, next) {
        db.query('select users.userid, firstname , lastname,position from users', (err, result) => {
            if (err) {
                throw err
            }
            res.render('../views/project/add', { names: result.rows, session: req.session.user })
        })
    })
    router.post('/AddProject', helpers.isLoggedIn, function (req, res, next) {
        db.query(`insert into projects(name) values($1) returning *`, [req.body.pname], (err,data) => {
            if (err) {
                throw err
            }
            let pros = data.rows[0]
            db.query(`insert into members(userid,role,projectid) values($1,$2,$3) `, [req.body.namelist, req.body.idOpt, pros.projectid])
                .then(res.redirect('/'))

        })
    })
    router.get('/DeleteProject/:id', helpers.isLoggedIn, helpers.isAdmin, (req, res, next) => {
        db.query('delete from members where projectid = $1', [req.params.id], (err) => {
            if (err) {
                throw err
            } db.query('delete from projects where projectid = $1', [req.params.id], (err) => {
                res.redirect('/')
            })
        })

    })
    router.get('/EditProject/:id', helpers.isLoggedIn, function (req, res, next) {
        db.query('select * from projects where projectid = $1', [req.params.id])
            .then(result => {
                res.render('../views/project/edit', { data: result.rows[0], session: req.session.user })
            })
    })
    router.post('/EditProject/:id', helpers.isLoggedIn, function (req, res, next) {
        db.query('update projects set projectid = $1, name = $2', [req.body.projectid, req.body.name])
            .then(res.redirect('/'))
    })

    return router
}