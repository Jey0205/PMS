var express = require('express');
var router = express.Router();
const helpers = require('../helper/util')


module.exports = function (db) {
    /*PROJECT*/
    router.get('/AddProject', helpers.isLoggedIn, function (req, res, next) {
        db.query('select users.userid, firstname , lastname from users')
            .then(result => {
                res.render('../views/project/add', { names: result.rows })
            })

            .catch(e => console.error(e))
    })
    router.post('/AddProject', helpers.isLoggedIn, function (req, res, next) {
        db.query(`insert into projects(name) values($1)`, [req.body.pname], (err) => {
            if(err){
                throw err
            }
            db.query(`insert into members(userid) values($1)`, [req.body.idOpt])
                .then(res.redirect('/'))

        })
    })
    router.get('/DeleteProject/:id', helpers.isLoggedIn, function (req, res, next) {
        db.query('delete from projects where projectid = $1', [req.body.id])
            .then(res.redirect('/'))
    })
    router.get('/EditProject/:id', helpers.isLoggedIn, function (req, res, next) {
        db.query('select * from projects where projectid = $1', [req.params.id])
            .then(result => {
                res.render('../views/project/edit', { data: result.rows[0] })
            })
    })
    router.post('/EditProject/:id', helpers.isLoggedIn, function (req, res, next) {
        db.query('update projects set projectid = $1, name = $2',[req.body.projectid, req.body.name])
            .then(res.redirect('/'))
    })

    return router
}