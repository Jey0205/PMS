
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
            params.push(`projects.name ilike '%${name}%'`)
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
        console.log(queryCount)

        db.query(queryCount, (err, result) => {
            let total = result.rows.length;
            let pages = Math.ceil(total / limitTab);
            db.query(querys, (err, data) => {
                if (err) {
                    throw err;
                }
                db.query(
                    "select option from users where userid = $1", [req.session.user.userid], (err, option) => {
                        if (err) {
                            throw err;
                        }
                        db.query("select * from users", (err, names) => {
                            if (err) {
                                throw err;
                            }
                            console.log(option.rows[0], result.rows, data.rows, names.rows)
                            res.render("../views/index", {
                                data: data.rows,
                                option: option.rows[0].option,
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


    router.post('/', helpers.isLoggedIn, (req, res, next) => {
        db.query('update users set option = $1 where userid = $2', [req.body, req.session.user.userid])
            .then(res.redirect('/'))
            .catch(e => console.error(e))
    })


    /* overview */
    router.get('/overview/:projectid', helpers.isLoggedIn, (req, res, next) => {
        const projectid = req.params.projectid
        res.render('../views/sidebar/overview',{projectid})
    })

    /* members */
    router.get('/members/:projectid', helpers.isLoggedIn, function (req, res, next) {
        const projectid = req.params.projectid
        const url = req.url == `/members/${projectid}` ? `/members/${projectid}?page=1` : `${req.url}`
        const page = parseInt(req.query.page) || 1;
        const limitTab = 3
        let offset = (page - 1) * limitTab;
        let name = req.query.name
        let position = req.query.position
        let addmem = req.query.addmeth
        let params = []


        if (name) {
            params.push(`users.firstname ilike '%${name}%'`)
        }
        if (position) {
            params.push(`members.role = '${position}'`)
        }
        let querys = `select members.id, members.userid,  users.firstname as name, members.role as position FROM members INNER JOIN users USING (userid) order by members.id limit 3 offset 0;
        `
        let queryCount = `select members.id,  users.firstname as name, members.role as position FROM members INNER JOIN users USING (userid)  order by members.id`

        if (page) {
            querys = `select members.id, members.userid, users.firstname as name, members.role as position FROM members INNER JOIN users USING (userid)  order by members.id limit 3 offset ${offset}`
        }
        if (params.length > 0) {
            querys = `select members.id, members.userid, users.firstname as name, members.role as position FROM members INNER JOIN users USING (userid)`;
            queryCount = `select members.id, users.firstname as name, members.role as position FROM members INNER JOIN users USING (userid)`;

            querys += ` where ${params.join(" and ")} limit 3 offset ${offset}`

            queryCount += ` where ${params}`
        }

        db.query(queryCount, (err, result) => {
            let total = result.rows.length;
            let pages = Math.ceil(total / limitTab);
            db.query(querys, (err, data) => {
                if (err) {
                    throw err;
                }
                db.query(
                    "select optionmem from users where userid = $1", [req.session.user.userid], (err, option) => {
                        if (err) {
                            throw err;
                        }
                        db.query("select * from users", (err, names) => {
                            if (err) {
                                throw err;
                            }
                            db.query('select users.userid, users.firstname,users.position from users order by users.userid', (err, result) => {
                                if (err) {
                                    throw err
                                }
                                db.query('select * from projects', (err, project) => {
                                    if (err) {
                                        throw err
                                    }
                                    res.render("../views/sidebar/member/members", {
                                        data: data.rows,
                                        optionmem: option.rows[0].optionmem,
                                        names: names.rows,
                                        user: result.rows,
                                        pros : project.rows,
                                        projectid,
                                        addmem,
                                        position,
                                        name,
                                        pages,
                                        page,
                                        url,
                                        session: req.session.user
                                    })


                                })
                            });
                        });
                    }
                );
            });
        });
    });

    router.get('/members/:projectid/addmember', helpers.isLoggedIn ,(req,res,next) =>{
        const projectid = req.params.projectid
        db.query('select * from users',(err,names)=>{
            if (err) {
                throw err
            }
            db.query('select * from projects', (err,pros) =>{
                if (err) {
                    throw err
                }
                res.render('../views/sidebar/member/addmember',{user : names.rows , pros : pros.rows, projectid})
            })
        })
    })
    router.post('/members/:projectid/addember', helpers.isLoggedIn, (req, res, next) => {
        const projectid = req.params.projectid
        db.query('insert into members(userid , role, projectid) values($1,$2,$3)', [req.body.userid, req.body.role, projectid])
            .then(res.redirect(`/members/${projectid}`))
    })

    /* Option Member */
    router.post('/members/:projectid', helpers.isLoggedIn, (req, res, next) => {
        const projectid = req.params.projectid
        db.query('update users set optionmem = $1 where userid = $2', [req.body, req.session.user.userid])
            .then(res.redirect(`/members/${projectid}`))
            .catch(e => {throw e})
    })

    /* Delete and Edit Members */
    router.get('/members/:projectid/delete/:userid', helpers.isLoggedIn, (req, res, next) => {
        const projectid = req.params.projectid
        db.query('delete from members where projectid  = $1 and  userid = $2', [projectid, req.params.userid])
                .then(res.redirect(`/members/${projectid}`))
            })
    


    router.get('/members/:projectid/edit/:userid', helpers.isLoggedIn, (req, res, next) => {
        const projectid = req.params.projectid
        db.query('select * from users', (err,names) =>{
            if (err) {
                throw err
            }
            db.query('select * from projects', (err,pros) =>{
                if (err) {
                    throw err
                }
                res.render(`../views/sidebar/member/editmember`, {nama : names.rows, project : pros.rows, projectid})
            })
        })
            
    })

    router.post('/members/:projectid/edit/:userid', helpers.isLoggedIn, (req,res,next) => {
        const projectid = req.params.projectid
        db.query(`update members set userid = $1, role = $2, projectid = $3 where userid = $4 `,[req.body.namelist,req.body.poscheck,req.body.proslist, req.params.userid])
        .then(res.redirect(`/members/${projectid}`))
        .catch(err => { throw err})
    })


    /* GET add user*/
    router.get('/register', helpers.isLoggedIn, (req, res, next) => {
        res.render('../views/login/register', { title: 'Express' });
    });
    router.post('/register', helpers.isLoggedIn, (req, res, next) => {
        bcrypt.hash(req.body.password, salt, function (err, hash) {
            if (req.body.typeFt == true) {
                console.log(req.body.typeFt)
                db.query(`insert into users(email,password,firstname,lastname,position) values ('${req.body.email}','${hash}','${req.body.firstname}','${req.body.lastname}','${req.body.position}')`, [])
                    .then(res.redirect('/'))
                    .catch(e => console.error(e));
            } else {
                db.query(`insert into users(email,password,firstname,lastname,isfulltime, isparttime,position) values ('${req.body.email}','${hash}','${req.body.firstname}','${req.body.lastname}','${req.body.position}')`, [])
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