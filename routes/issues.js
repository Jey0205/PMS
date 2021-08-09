var express = require('express');
const fileUpload = require('express-fileupload');
var router = express.Router();
const helpers = require('../helper/util');
var path = require('path')


module.exports = function (db) {

  router.get('/:projectid', helpers.isLoggedIn, (req, res, next) => {
    const projectid = req.params.projectid
    const url = req.url == `/issues/${projectid}` ? `/issues/${projectid}?page=1` : `${req.url}`
    const page = parseInt(req.query.page) || 1;
    const limitTab = 3
    let offset = (page - 1) * limitTab;
    let issueid = req.query.issueid
    let subject = req.query.subject
    let tracker = req.query.tracker
    let params = []

    if (issueid) {
      params.push(`issues.issueid = '${issueid}'`)
    }
    if (subject) {
      params.push(`issues.subject ilike '%${subject}%'`)
    }
    if (tracker) {
      params.push(`issues.tracker = '${tracker}'`)
    }
    let querys = `select * from issues where projectid = ${projectid} order by issueid limit ${limitTab} offset ${offset}`

    let queryCount = `select count(*) as total from issues where projectid = ${projectid}`

    if (params.length > 0) {
      querys = `select * from issues where projectid = ${projectid} and`;
      queryCount = `select count(*) as total from issues where projectid = ${projectid} and`;

      querys += `${params.join(" and ")} order by issueid limit 3 offset ${offset}`

      queryCount += `${params.join(" and ")}`
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
            if (err) {
              throw err;
            } res.render("../views/sidebar/issues/issues", {
              data: data.rows,
              optionisu: option.rows[0].optionisu,
              projectid,
              issueid,
              subject,
              tracker,
              pages,
              page,
              url,
              session: req.session.user,
            });
          });
      });
    });
  });

  /* Option Issues */
  router.post('/:projectid', helpers.isLoggedIn, (req, res, next) => {
    const projectid = req.params.projectid
    db.query('update users set optionisu = $1 where userid = $2', [req.body, req.session.user.userid])
      .then(res.redirect(`/issues/${projectid}`))
      .catch(e => { throw e })
  })



  /* Add Issues */
  router.get('/:projectid/addissues', helpers.isLoggedIn, (req, res, next) => {
    const projectid = req.params.projectid
    db.query('select firstname,lastname,userid from users', (err, names) => {
      if (err) {
        throw err
      }
      db.query('select name from projects', (err, projects) => {
        if (err) {
          throw err
        }
        res.render('../views/sidebar/issues/addissues', { projectid, nama: names.rows, project: projects.rows, info: req.flash('info') })
      })

    })
  })

  router.post('/:projectid/addissues', helpers.isLoggedIn, (req, res, next) => {
    const projectid = req.params.projectid
    const { options,
      subject,
      description,
      optionStat,
      optionPrior,
      assignee,
      startDate,
      dueDate,
      estimatedTime,
      done,
    } = req.body;
    const manyFiles = []

    if (!req.files) {
      return db.query(
        "insert into issues(projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, author, createddate) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())",
        [
          projectid,
          req.body.options,
          req.body.subject,
          req.body.description,
          req.body.optionStat,
          req.body.optionPrior,
          req.body.assignee,
          req.body.startDate,
          req.body.dueDate,
          req.body.estimatedTime,
          req.body.done,
          req.session.user.userid,
        ],
        (err) => {
          if (err) throw err;
          res.redirect(`/issues/${projectid}`);
        }
      );
    } else if (req.files.file.length > 1) {
      req.files.file.forEach(item => {
        let fileName = `${Date.now()}|${item.name}`;
        let pathFile = path.join(__dirname, "..", "public", "images", "upload", fileName)
        item.mv(pathFile, (err) => {
          if (err) {
            throw err;
          }
          manyFiles.push({ name: fileName, type: item.mimetype });
        })
        console.log(manyFiles)
      })
    } else if (req.files.file) {
      let fileName = `${Date.now()}|${req.files.file.name}`;
      let uploadPath = path.join(__dirname, "..", "public", "images", "upload", fileName);
      req.files.file.mv(uploadPath, (err) => {
        if (err) {
          throw err;
        }
        manyFiles.push({ name: fileName, type: req.files.file.mimetype });
      });
    }
    if (req.files.file) {
      console.log(manyFiles);
      db.query(
        "insert into issues(projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, files, author, createddate) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())",
        [
          projectid,
          req.body.options,
          req.body.subject,
          req.body.description,
          req.body.optionStat,
          req.body.optionPrior,
          req.body.assignee,
          req.body.startDate,
          req.body.dueDate,
          req.body.estimatedTime,
          req.body.done,
          manyFiles,
          req.session.user.userid,
        ],
        (err) => {
          res.redirect(`/issues/${projectid}`);
        }
      );
    }
  })

  /* Edit Issues*/
  router.get('/:projectid/editissues/:issueid', helpers.isLoggedIn, (req, res, next) => {
    const projectid = req.params.projectid
    db.query('select firstname,lastname,userid from users', (err, names) => {
      if (err) {
        throw err
      }
      db.query(`select tracker, subject,description,status,priority,assignee,startdate,duedate,estimatedtime,done,files from issues`, (err, isu) => {
        if (err) {
          throw err
        }
        res.render('../views/sidebar/issues/editissues', { projectid, nama: names.rows, issue: isu.rows[0] })
      })
    })
  })

  router.post('/:projectid/editissues/:issueid', helpers.isLoggedIn, (req, res, next) => {
    const projectid = req.params.projectid
    db.query(`update issues set tracker = $1 , subject = $2 ,description = $3 ,status = $4 ,priority = $5 ,assignee = $6 ,startdate = $7,duedate = $8,estimatedtime = $9, done = $10 ,files = $11, spenttime = $12, targetversion = $13, author = $14, createddate = $15, updateddate = $16, closeddate = $17 where issueid = ${req.params.issueid}`, [req.body.option, req.body.subject, req.body.description, req.body.optionstat, req.body.prior, req.body.issueid, req.body.startDate, req.body.dueDate, req.body.estimatedTime, req.body.percentage, req.body.files, req.body.spentTime, req.body.targetVer, req.body.author, req.body.createdDate, req.body.updateDate, req.body.closedDate])
      .then(res.redirect(`/issues/${projectid}`))
      .catch(err => {
        throw err
      })
  })

  /* Delete Issues */
  router.get('/:projectid/deleteissues/:issueid', helpers.isLoggedIn, (req, res, next) => {
    const projectid = req.params.projectid
    db.query('delete from issues where issueid = $1', [req.params.issueid])
      .then(res.redirect(res.redirect(`/issues/${projectid}`)))
  })



  return router;
}