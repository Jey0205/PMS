var express = require('express');
const { route, get } = require('../app');
var router = express.Router();
const helpers = require('../helper/util');


module.exports = function (db) {

  router.get('/:projectid', helpers.isLoggedIn, (req, res, next) => {
    const projectid = req.params.projectid
    const url = req.url == `/members/${projectid}` ? `/members/${projectid}?page=1` : `${req.url}`
    const page = parseInt(req.query.page) || 1;
    const limitTab = 3
    let offset = (page - 1) * limitTab;
    let issueid = req.query.issueid
    let subject = req.query.subject
    let tracker = req.query.tracker
    let params = []


    if (subject) {
      params.push(`issues.subject ilike '%${subject}%'`)
    }
    if (tracker) {
      params.push(`issues.tracker = '${tracker}'`)
    }
    if (issueid) {
      params.push(`issues.issueid = ${issueid}`)
    }
    let querys = `select issueid, subject, tracker from issues order by issueid limit 3 offset 0;
    `
    let queryCount = `select issueid, subject, tracker from issues order by issueid `

    if (page) {
      querys = `select issueid, subject, tracker from issues order by issueid limit 3 offset ${offset}`
    }
    if (params.length > 0) {
      querys = `select issueid, subject, tracker from issues order by issueid`;
      queryCount = `select issueid, subject, tracker from issues order by issueid`;

      querys += ` where ${params.join(" and ")} limit 3 offset ${offset}`

      queryCount += ` where ${params}`
    }

    db.query(queryCount, (err, result) => {
      let total = result.rows.length;
      let pages = Math.ceil(total / limitTab);
      db.query(querys, (err, data) => {
        console.log(data.rows);
        if (err) {
          throw err;
        }
        db.query(
          "select optionisu from users where userid = $1", [req.session.user.userid], (err, option) => {
            console.log(option.rows[0].optionisu);
            if (err) {
              throw err;
            }
            db.query("select * from issues", (err, isu) => {
              if (err) {
                throw err;
              }
              res.render("../views/sidebar/issues/issues", {
                data: data.rows,
                optionisu: option.rows[0].optionisu,
                issue: isu.rows,
                projectid,
                issueid,
                subject,
                tracker,
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

  /* Option Member */
  router.post('/:projectid', helpers.isLoggedIn, (req, res, next) => {
    const projectid = req.params.projectid
    db.query('update users set optionisu = $1 where userid = $2', [req.body, req.session.user.userid])
        .then(res.redirect(`/issues/${projectid}`))
        .catch(e => {throw e})
})



  /* Add Issues */
  router.get('/:projectid/addissues', helpers.isLoggedIn, (req, res, next) => {
    const projectid = req.params.projectid
    db.query('select firstname,lastname from users', (err, names) => {
      if (err) {
        throw err
      }
      res.render('../views/sidebar/issues/addissues', { projectid, nama: names.rows })
    })
  })

  router.post('/:projectid/addissues', helpers.isLoggedIn, (req,res,next) =>{
    const projectid = req.params.projectid
    db.query('insert into issues(tracker, subject,description,status,priority,assignee,startdate,duedate,estimatedtime,done,files) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [req.body.option, req.body.subject, req.body.description, req.body.optionstat, req.body.prior, req.body.issueid, req.body.startDate, req.body.dueDate, req.body.estimatedTime, req.body.percentage, req.body.files])
    .then(res.redirect(`/issues/${projectid}`))
  })

  /* Edit Issues*/
  router.get('/:projectid/editissues', helpers.isLoggedIn, (req, res, next) => {
    const projectid = req.params.projectid
    db.query('select firstname,lastname from users', (err, names) => {
      if (err) {
        throw err
      }
      db.query(`select tracker, subject,description,status,priority,assignee,startdate,duedate,estimatedtime,done,files from issues`, (err,isu) =>{
        if (err) {
          throw err
        }
        res.render('../views/sidebar/issues/editissues', { projectid, nama: names.rows, issue: isu.rows })
      })
    })
  })

  router.post('/:projectid/editissues', helpers.isLoggedIn, (req, res, next) =>{
    const projectid = req.params.projectid
    db.query(`update issues set tracker = $1 , subject = $2 ,description = $3 ,status = $4 ,priority = $5 ,assignee = $6 ,startdate = $7,duedate = $8,estimatedtime = $9, done = $10 ,files = $11, spenttime = $12, targetversion = $13, author = $14, createddate = $15, updateddate = $16, closeddate = $17 where issueid = ${req.params.issueid}`,[])
    .then(res.redirect(`/issues/${projectid}`))
  })

  /* Delete Issues */
  router.get('/:projectid/deleteissues', helpers.isLoggedIn, (req, res, next) => {
    const projectid = req.params.projectid
    db.query('delete from issues where issueid = $1', [req.params.issueid])
    .then(res.redirect(res.redirect(`/issues/${projectid}`)))
  })


  return router;
}