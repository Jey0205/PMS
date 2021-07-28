
var express = require('express');
var router = express.Router();
const helpers = require('../helper/util')


module.exports = function (db) {
    /* HOMEPAGE. */
    router.get('/', helpers.isLoggedIn, function (req, res, next) {
        const url = req.url == "/" ? "/?page=1" : req.url;
        const page = parseInt(req.query.page) || 1;
        const limitTab = 3
        let offset = (page - 1) * limitTab;
        let projectid = req.query.projectid
        let name = req.query.name
        let members = req.query.members
        let params = []


        if (name) {
            params.push(`projects.name ilike %${name}%`)
        }
        if (projectid) {
            params.push(`projects.projectid = ${projectid}`)
        }
        if (members) {
            params.push(`members.userid = ${members}`)
        }
        let querys = `select projects.projectid, projects.name, ARRAY_AGG(' ' || users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid) group by projects.projectid, projects.name order by projects.projectid limit 3 offset 0;
        `
        let queryCount = `select projects.projectid, projects.name, ARRAY_AGG(' ' || users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid) group by projects.projectid, projects.name order by projects.projectid`

        if (page) {
            querys = `select projects.projectid, projects.name, ARRAY_AGG(' ' || users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid) group by projects.projectid, projects.name order by projects.projectid limit 3 offset ${offset}`
        }

        db.query(queryCount, [], (err, data) => {
            let totalPage = data.rows.length;
            let pages = Math.ceil(totalPage / limitTab)
            if (err) {
                throw err
            }
            db.query(querys)
                .then(data => {
                    res.render('../views/index', { data: data.rows, totalPage, projectid, name, members, page, pages, url })
                })
        })


    });


    /* Logout */
    router.get('/logout', helpers.isLoggedIn, function (req, res, next) {
        req.session.destroy.then(res.redirect('/login'))
            .catch(err => console.error(err))

    })

    return router;

}