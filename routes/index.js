
var express = require('express');
var router = express.Router();
const helpers = require('../helper/util');
const bcrypt = require('bcrypt');
const salt = 5;
var moment = require('moment');



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
        let basename = 'Project'


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
                            console.log(req.session.user)
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
                                session: req.session.user,
                                info: req.flash('info'),
                                success: req.flash('success'),
                                base: basename
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
        let basename = 'Overview'
        db.query(`select projectid, tracker,subject,status from issues left join projects using (projectid) where projectid = ${projectid}`, (err, issue) => {
            if (err) {
                throw err
            }
            db.query(`select count(*) as total from issues where tracker = 'Bug' and projectid = $1`, [projectid], (err, totalBug) => {
                if (err) {
                    throw err
                }
                db.query(`select count(*) as total from issues where tracker = 'Feature' and projectid = $1`, [projectid], (err, totalFeature) => {
                    if (err) {
                        throw err
                    }
                    db.query(`select count(*) as total from issues where tracker = 'Support' and projectid = $1`, [projectid], (err, totalSupport) => {
                        if (err) {
                            throw err
                        }
                        db.query(`select * from users where userid in (select userid from members where projectid = ${projectid})`, (err, names) => {
                            if (err) {
                                throw err
                            }
                            db.query(`select count(*) as total from issues where tracker = 'Bug' and projectid = $1 and not status = 'Closed'`, [projectid], (err, openBug) => {
                                if (err) {
                                    throw err
                                } db.query(`select count(*) as total from issues where tracker = 'Feature' and projectid = $1 and not status = 'Closed'`, [projectid], (err, openFeature) => {
                                    if (err) {
                                        throw err
                                    } db.query(`select count(*) as total from issues where tracker = 'Support' and projectid = $1 and not status = 'Closed'`, [projectid], (err, openSupport) => {
                                        if (err) {
                                            throw err
                                        }
                                        res.render('../views/sidebar/overview', {
                                            projectid,
                                            isu: issue.rows,
                                            nama: names.rows,
                                            total: totalBug.rows[0],
                                            total2: totalFeature.rows[0],
                                            total3: totalSupport.rows[0],
                                            open: openBug.rows[0],
                                            open2: openFeature.rows[0],
                                            open3: openSupport.rows[0],
                                            session: req.session.user,
                                            success: req.flash('success'),
                                            base: basename
                                        })
                                    })

                                })
                            })
                        })
                    })
                })
            })
        })
    })


    /* Activity */
    router.get('/activity/:projectid', helpers.isLoggedIn, (req, res, next) => {
        const projectid = req.params.projectid
        let basename = 'Activity'
        db.query(`select issues.projectid, activity.time, activity.title, activity.description, activity.author, users.firstname, issues.issueid  from activity left join users on activity.author = users.userid left join issues on activity.issueid = issues.issueid where projectid = $1 and time > current_date - interval '7 days' order by activity.time desc`, [projectid], (err, data) => {
            if (err) {
                throw err
            }
            let result = []
            data.rows.forEach((item) => {
                if (
                    result[moment(item.time).format("dddd")] &&
                    result[moment(item.time).format("dddd")].data
                ) {
                    result[moment(item.time).format("dddd")].data.push(item);
                } else {
                    result[moment(item.time).format("dddd")] = {
                        date: moment(item.time).format("YYYY-MM-DD"),
                        data: [item],
                    };
                }
            });

            let now = new Date();
            let from = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
            res.render('../views/sidebar/activity', {
                projectid,
                data: data.rows,
                moment: moment,
                result,
                now,
                from,
                session: req.session.user,
                base: basename
            })
        })

    })


    /* members */
    router.get('/members/:projectid', helpers.isLoggedIn, function (req, res, next) {
        const projectid = req.params.projectid
        let basename = 'Members'
        const url = req.url == `/members/${projectid}` ? `/members/${projectid}?page=1` : `${req.url}`
        const page = parseInt(req.query.page) || 1;
        var limitTab = 3
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
        let querys = `select members.id, members.userid,  users.firstname as name, members.role as position FROM members INNER JOIN users USING (userid) where projectid = ${projectid} order by users.firstname limit ${limitTab} offset ${offset};
        `
        let queryCount = `select members.id,  users.firstname as name, members.role as position FROM members INNER JOIN users USING (userid) where projectid = ${projectid}  order by users.firstname`

        if (params.length > 0) {
            querys = `select members.id, members.userid, users.firstname as name, members.role as position FROM members INNER JOIN users USING (userid) where projectid = ${projectid} and `;
            queryCount = `select members.id, users.firstname as name, members.role as position FROM members INNER JOIN users USING (userid) where projectid = ${projectid} and `;

            querys += ` ${params.join(" and ")} limit ${limitTab} offset ${offset}`

            queryCount += `${params.join(" and ")} order by users.firstname`
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
                            db.query('select users.userid, users.firstname,users.position from users order by users.firstname', (err, result) => {
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
                                        pros: project.rows,
                                        projectid,
                                        addmem,
                                        position,
                                        name,
                                        pages,
                                        page,
                                        url,
                                        session: req.session.user,
                                        info: req.flash('info'),
                                        base: basename
                                    })


                                })
                            });
                        });
                    }
                );
            });
        });
    });

    /*Add Member */
    router.get('/members/:projectid/addmember', helpers.isLoggedIn, (req, res, next) => {
        const projectid = req.params.projectid
        let basename = 'Add Members'
        db.query(`select * from users where not userid in (select userid from members where projectid = ${projectid})`, (err, names) => {
            if (err) {
                throw err
            }
                res.render('../views/sidebar/member/addmember', {
                    user: names.rows,
                    projectid,
                    session: req.session.user,
                    base: basename
                })
            
        })
    })
    router.post('/members/:projectid/addmember', helpers.isLoggedIn, (req, res, next) => {
        const projectid = req.params.projectid
        let sql = "insert into members(userid, role, projectid) values";
            for (let i = 0; i < req.body.namecheck.length; i++) {
                if (i < req.body.namecheck.length - 1) {
                  sql += `(${req.body.namecheck[i]}, '${req.body.role[i]}', ${projectid}),`;
                }
                if (i == req.body.namecheck.length - 1) {
                  sql += `(${req.body.namecheck[i]}, '${req.body.role[i]}', ${projectid})`;
                } 
              }
              
              db.query(sql, (err) =>{
                  if(err){
                      throw err
                  }
                  res.redirect(`/members/${projectid}`)
              })
    })

    /* Option Member */
    router.post('/members/:projectid', helpers.isLoggedIn, (req, res, next) => {
        const projectid = req.params.projectid
        db.query('update users set optionmem = $1 where userid = $2', [req.body, req.session.user.userid])
            .then(res.redirect(`/members/${projectid}`))
            .catch(e => { throw e })
    })

    /* Delete and Edit Members */
    router.get('/members/:projectid/delete/:userid', helpers.isLoggedIn, helpers.isAdmin, (req, res, next) => {
        const projectid = req.params.projectid
        db.query('delete from members where projectid  = $1 and  userid = $2', [projectid, req.params.userid])
            .then(res.redirect(`/members/${projectid}`))
    })



    router.get('/members/:projectid/edit/:userid', helpers.isLoggedIn, (req, res, next) => {
        const projectid = req.params.projectid
        let basename = 'Edit Members'
        db.query('select * from users ', (err, names) => {
            if (err) {
                throw err
            }
            db.query('select * from projects', (err, pros) => {
                if (err) {
                    throw err
                }
                res.render(`../views/sidebar/member/editmember`, {
                    nama: names.rows,
                    project: pros.rows,
                    projectid,
                    session: req.session.user,
                    base: basename
                })
            })
        })

    })

    router.post('/members/:projectid/edit/:userid', helpers.isLoggedIn, (req, res, next) => {
        const projectid = req.params.projectid
        db.query(`update members set role = $1 where userid = $2 and projectid = $3`, [req.body.poslist, req.params.userid ,projectid], (err) => {
            if (err) {
                throw err
            }
            res.redirect(`/members/${projectid}`)
        })
    })


    /* GET add user*/
    router.get('/register', helpers.isLoggedIn, helpers.isAdmin, (req, res, next) => {
        let basename = 'Add User'
        res.render('../views/login/register', { session: req.session.user, base: basename });
    });
    router.post('/register', helpers.isLoggedIn, (req, res, next) => {
        bcrypt.hash(req.body.password, salt, (err, hash) => {
            db.query(`insert into users(email,password,firstname,lastname,position,option,optionmem,optionisu,role) values ('${req.body.email}','${hash}','${req.body.firstname}','${req.body.lastname}','${req.body.position}','${req.body.option}','${req.body.optionmem}','${req.body.optionisu}','${req.body.role}')`, [])
                .then(res.redirect('/'))
        })
    });


    /* Logout */
    router.get('/logout', helpers.isLoggedIn, (req, res, next) => {
        req.session.destroy.then(res.redirect('/login'))
            .catch(err => console.error(err))

    })

    return router;

}