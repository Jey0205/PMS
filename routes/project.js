var express = require('express');
var router = express.Router();
const helpers = require('../helper/util')


module.exports = function (db) {
    /*PROJECT*/
    router.get('/AddProject', helpers.isLoggedIn, function (req, res, next) {
        db.query('select firstname , lastname from users')
            .then(result => {
                res.render('../views/project/add', {nama: result.rows })
                console.log(result.rows)
            })
            
            .catch(e => console.error(e))
    })
    router.post('/AddProject', helpers.isLoggedIn, function (req, res, next) {
        db.query(`insert into projects(name),members(userid) values($1, $2)`, [req.body.pname, req.body.userid])
            .then(res.redirect('/'))
    })
    router.get('/DeleteProject/:id', helpers.isLoggedIn, function (req, res, next) {
        db.query('delete from projects where id = $1', [req.body.id])
            .then(res.redirect('/'))
    })
    router.get('/EditProject/:id', helpers.isLoggedIn, function (req, res, next) {
        db.query('select * from projects where projectid = $1', [req.params.id])
            .then(result => {
                res.render('../views/project/edit', { data: result.rows[0] })
            })
    })
    router.post('/EditProject/:id', helpers.isLoggedIn, function (req, res, next) {
        db.query('update projects set projectid = $1, name = $2'[req.body.projectid, req.body.pname])
            .then(res.redirect('/'))
    })

    return router
}