
var express = require('express');
var router = express.Router();
const helpers = require('../helper/util')
const bcrypt = require('bcrypt');
const salt = 5;



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
        if (params.length > 0) {
            querys = `select projects.projectid, projects.name, ARRAY_AGG(' ' || users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid)`;
            queryCount = `select projects.projectid, projects.name, ARRAY_AGG(' ' || users.firstname) as members FROM members INNER JOIN users USING (userid) INNER JOIN projects USING (projectid)`;

            querys += ` where ${params.join(" and ")} group by projects.projectid , projects.name order by projects.projectid limit 3 offset ${offset}`

            queryCount += ` where ${params.join(" and ")} group by projects.projectid, projects.name order by projects.projectid`
        }

        db.query(queryCount, (err, result) => {
            let total = result.rows.length;
            let pages = Math.ceil(total / 3);
            db.query(querys, (err, data) => {
                if (err) {
                    throw err;
                }
                db.query(
                    "select option from users where userid = $1",
                    [req.session.user.userid],
                    (err, option) => {
                        if (err) {
                            throw err;
                        }
                        db.query("select * from users", (err, names) => {
                            if (err) {
                                throw err;
                            }
                            res.render("../views/index", {
                                data: data.rows,
                                option: option.rows[0].options,
                                names: names.rows,
                                projectid,
                                members,
                                name,
                                pages,
                                page,
                                url,
                                session: req.session.user
                            });
                        });
                    }
                );
            });
        });
    });



    /* GET register page. */
    router.get('/register', function (req, res, next) {
        res.render('../views/login/register', { title: 'Express' });
    });
    router.post('/register', function (req, res, next) {
        bcrypt.hash(req.body.password, salt, function (err, hash) {
            if (req.body.typeFt == true) {
                db.query(`insert into users(email,password,firstname,lastname,isfulltime, isparttime,position) values ('${req.body.email}','${hash}','${req.body.firstname}','${req.body.lastname}', true, false,'${req.body.position}')`, [])
                    .then(res.redirect('/'))
                    .catch(e => console.error(e));
            } else {
                db.query(`insert into users(email,password,firstname,lastname,isfulltime, isparttime,position) values ('${req.body.email}','${hash}','${req.body.firstname}','${req.body.lastname}', false, true ,'${req.body.position}')`, [])
                    .then(res.redirect('/'))
                    .catch(e => console.error(e));

            }
        })
    });


    /* Logout */
    router.get('/logout', helpers.isLoggedIn, (req, res, next) => {
        req.session.destroy.then(res.redirect('/login'))
            .catch(err => console.error(err))

    })

    return router;

}