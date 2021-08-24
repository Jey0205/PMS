var express = require('express');
const fileUpload = require('express-fileupload');
var router = express.Router();
const helpers = require('../helper/util');
var path = require('path');
var moment = require('moment');



module.exports = function (db) {

  router.get('/:projectid', helpers.isLoggedIn, (req, res, next) => {
    const projectid = req.params.projectid
    const issue = req.params.issueid
    const url = req.url == `/issues/${projectid}` ? `/issues/${projectid}?page=1` : `${req.url}`
    const page = parseInt(req.query.page) || 1;
    const limitTab = 3
    const baseUrl = `http://${req.headers.host}`
    let offset = (page - 1) * limitTab;
    let issueid = req.query.issueid
    let subject = req.query.subject
    let tracker = req.query.tracker
    let params = []
    let basename = 'Issues'

    if (issueid) {
      params.push(`issues.issueid = '${issueid}'`)
    }
    if (subject) {
      params.push(`issues.subject ilike '%${subject}%'`)
    }
    if (tracker) {
      params.push(`issues.tracker = '${tracker}'`)
    }
    let querys = `select issues.*,users.firstname,users.lastname from issues,users where projectid = ${projectid} and assignee = userid order by issueid limit ${limitTab} offset ${offset}`

    let queryCount = `select count (*) as total from issues where projectid = ${projectid}`

    if (params.length > 0) {
      querys = `select issues.*,users.firstname,users.lastname from issues,users where projectid = ${projectid} and assignee = userid and `;
      queryCount = `select count (*) as total from issues where projectid = ${projectid} and `;

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
            } 
              res.render("../views/sidebar/issues/issues", {
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
                info: req.flash('info'),
                success: req.flash('success'),
                base: basename,
                moment: moment,
                baseUrl,
                issue
              
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
    let basename = 'Add Issues'
    let today = Date.now()
    db.query('select firstname,lastname,userid from users', (err, names) => {
      if (err) {
        throw err
      }
      db.query('select name from projects', (err, projects) => {
        if (err) {
          throw err
        }
        res.render('../views/sidebar/issues/addissues', {
          projectid,
          nama: names.rows,
          project: projects.rows,
          info: req.flash('info'),
          session: req.session.user,
          today: today,
          base: basename
        })
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
        "insert into issues(projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, author, createddate, targetversion) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), 1.00)",
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
        "insert into issues(projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, files, author, createddate,targetversion) values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now(), 1.00)",
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
    const issueid = req.params.issueid
    const baseUrl = `http://${req.headers.host}`;
    let basename = 'Edit Issues'
    db.query(`select * from users where userid in (select assignee from issues where projectid = ${projectid} and issueid = ${issueid} and author = ${req.session.user.userid})`, (err, name) => {
      if (err) {
        throw err
      }
      db.query(`select * from users where not userid in (select assignee from issues where projectid = ${projectid} and issueid = ${issueid})`, (err, names) => {
        if (err) {
          throw err
        }
        db.query(`select * from issues where projectid = ${projectid} and issueid = ${issueid}`, (err, isu) => {
          if (err) {
            throw err
          } let nameFiles = [];
          if (isu.rows[0].files) {
            let files = isu.rows[0].files;
            files.forEach((item) => {
              nameFiles.push(item.name);
            });
          }
          db.query(`select createddate from issues where projectid = ${projectid} and issueid = ${issueid}`, (err, date) => {
            if (err) {
              throw err
            }
            db.query(`select startdate,duedate from issues where projectid = ${projectid} and issueid = ${issueid}`, (err, sddate) => {
              if (err) {
                console.log(req.session.userid)
                throw err
              }
              db.query(`select firstname, lastname from users where userid = ${req.session.user.userid}`, (err, orang) => {
                res.render('../views/sidebar/issues/editissues', {
                  projectid,
                  issueid,
                  nama: name.rows[0],
                  namnam: names.rows,
                  issue: isu.rows[0],
                  date: date.rows[0],
                  sdate: sddate.rows[0],
                  moment: moment,
                  people: orang.rows[0],
                  baseUrl,
                  session: req.session.user,
                  base: basename
                })
              })
            })
          })
        })
      })
    })
  })

  router.post('/:projectid/editissues/:issueid', helpers.isLoggedIn, (req, res, next) => {
    const projectid = req.params.projectid
    const issueid = req.params.issueid
    const manyFiles = []
    if (!req.files && !req.body.fileDb) {
      if (req.body.optionStat == "Closed") {
        return db.query(`update issues set tracker = $1, subject = $2, description = $3, status = $4, priority = $5, assignee = $6, estimatedtime = $7, done = $8, spenttime = $9, targetversion = $10, author = $11, updateddate = now(), closeddate = now(), files = null where issueid = ${issueid} returning *`,
          [req.body.options,
          req.body.subject,
          req.body.description,
          req.body.optionStat,
          req.body.optionPrior,
          req.body.issueid,
          req.body.estimatedTime,
          req.body.done,
          req.body.spentTime,
          req.body.targetVer,
          req.session.user.userid],
          (err, edit) => {
            if (err) {
              throw err
            }
            let log = edit.rows[0]
            db.query(`insert into activity(time, title, description, author, issueid) values(now(), $1, $2, $3, $4)`, [log.subject, log.description, log.author, issueid])
              .then(res.redirect(`/issues/${projectid}`))
              .catch(err => {
                throw err
              })
          })
      } else {
        return db.query(`update issues set tracker = $1, subject = $2, description = $3, status = $4, priority = $5, assignee = $6, estimatedtime = $7, done = $8, spenttime = $9, targetversion = $10, author = $11, updateddate = now(), files = null where issueid = ${issueid} returning *`,
          [req.body.options,
          req.body.subject,
          req.body.description,
          req.body.optionStat,
          req.body.optionPrior,
          req.body.issueid,
          req.body.estimatedTime,
          req.body.done,
          req.body.spentTime,
          req.body.targetVer,
          req.session.user.userid],
          (err, edit) => {
            if (err) {
              throw err
            }
            let log = edit.rows[0]
            db.query(`insert into activity(time, title, description, author, issueid) values(now(), $1, $2, $3, $4)`, [log.subject, log.description, log.author, issueid])
              .then(res.redirect(`/issues/${projectid}`))
              .catch(err => {
                throw err
              })
          })
      }

    }
    else if (!req.body.fileDb && req.files.file.length > 1) {
      req.files.file.forEach(item => {
        let fileName = `${Date.now()}|${item.name}`;
        let pathFile = path.join(__dirname, "..", "public", "images", "upload", fileName)
        manyFiles.push({ name: fileName, type: item.mimetype });
        item.mv(pathFile, (err) => {
          if (err) {
            throw err;
          }
        })
        console.log(manyFiles)
      })
    }
    else if (!req.body.fileDb && req.files.file) {
      let fileName = `${Date.now()}|${req.files.file.name}`;
      let uploadPath = path.join(__dirname, "..", "public", "images", "upload", fileName);
      manyFiles.push({ name: fileName, type: req.files.file.mimetype });
      req.files.file.mv(uploadPath, (err) => {
        if (err) {
          throw err;
        }
      });
    } else if (typeof req.body.fileDb == "object" && !req.files) {
      for (let i = 0; i < req.body.fileDb.length; i++) {
        manyFiles.push({
          name: req.body.fileDb[i],
          type: req.body.typeDb[i],
        });
      }
    } else if (typeof req.body.fileDb == "string" && !req.files) {
      manyFiles.push({ name: req.body.fileDb, type: req.body.typeDb });
    } else if (
      typeof req.body.fileDb == "object" &&
      req.files.file.length > 1
    ) {
      for (let i = 0; i < req.body.fileDb.length; i++) {
        manyFiles.push({
          name: req.body.fileDb[i],
          type: req.body.typeDb[i],
        });
      }
      req.files.file.forEach((item) => {
        let fileName = `${Date.now()}|${item.name}`;
        let uploadPath = path.join(
          __dirname,
          "..",
          "public",
          "images",
          "upload",
          fileName
        );
        manyFiles.push({ name: fileName, type: item.mimetype });
        item.mv(uploadPath, (err) => {
          if (err) {
            throw err;
          }
        });
      });
    } else if (req.body.fileDb && req.files.file.length > 1) {
      manyFiles.push({ name: req.body.fileDb, type: req.body.typeDb });
      req.files.file.forEach((item) => {
        let fileName = `${Date.now()}|${item.name}`;
        let uploadPath = path.join(
          __dirname,
          "..",
          "public",
          "images",
          "upload",
          fileName
        );
        manyFiles.push({ name: fileName, type: item.mimetype });
        item.mv(uploadPath, (err) => {
          if (err) {
            throw err;
          }
        });
      });
    } else if (typeof req.body.fileDb == "object" && req.files.file) {
      for (let i = 0; i < req.body.fileDb.length; i++) {
        manyFiles.push({
          name: req.body.fileDb[i],
          type: req.body.typeDb[i],
        });
      }

      let fileName = `${Date.now()}|${req.files.file.name}`;
      let uploadPath = path.join(
        __dirname,
        "..",
        "public",
        "images",
        "upload",
        fileName
      );
      manyFiles.push({ name: fileName, type: req.files.file.mimetype });
      req.files.file.mv(uploadPath, (err) => {
        if (err) {
          throw err;
        }
      });
    } else if (req.body.fileDb && req.files.file) {
      manyFiles.push({ name: req.body.fileDb, type: req.body.typeDb });
      let fileName = `${Date.now()}|${req.files.file.name}`;
      let uploadPath = path.join(
        __dirname,
        "..",
        "public",
        "images",
        "upload",
        fileName
      );
      manyFiles.push({ name: fileName, type: req.files.file.mimetype });
      req.files.file.mv(uploadPath, (err) => {
        if (err) {
          throw err;
        }
      });
    }
    if (req.body.fileDb || req.files.file) {
      if (req.body.optionStat == 'Closed') {
        return db.query(`update issues set tracker = $1, subject = $2, description = $3, status = $4, priority = $5,assignee = $6, estimatedtime = $7, done = $8, spenttime = $9, targetversion = $10, author = $11, updateddate = now(), closeddate = now(), files = $12 where issueid = ${issueid} returning *`,
          [req.body.options,
          req.body.subject,
          req.body.description,
          req.body.optionStat,
          req.body.optionPrior,
          req.body.issueid,
          req.body.estimatedTime,
          req.body.done,
          req.body.spentTime,
          req.body.targetVer,
          req.session.user.userid,
            manyFiles],
          (err, edit) => {
            if (err) {
              throw err
            }
            let log = edit.rows[0]
            db.query(`insert into activity(time, title, description, author, issueid) values(now(), $1, $2, $3, $4)`, [log.subject, log.description, log.author, issueid])
              .then(res.redirect(`/issues/${projectid}`))
              .catch(err => {
                throw err
              })
          })
      } else {
        return db.query(`update issues set tracker = $1, subject = $2, description = $3, status = $4, priority = $5,assignee = $6, estimatedtime = $7, done = $8, spenttime = $9, targetversion = $10, author = $11, updateddate = now(), files = $12 where issueid = ${issueid} returning *`,
          [req.body.options,
          req.body.subject,
          req.body.description,
          req.body.optionStat,
          req.body.optionPrior,
          req.body.issueid,
          req.body.estimatedTime,
          req.body.done,
          req.body.spentTime,
          req.body.targetVer,
          req.session.user.userid,
            manyFiles],
          (err, edit) => {
            if (err) {
              throw err
            }
            let log = edit.rows[0]
            db.query(`insert into activity(time, title, description, author, issueid) values(now(), $1, $2, $3, $4)`, [log.subject, log.description, log.author, issueid])
              .then(res.redirect(`/issues/${projectid}`))
              .catch(err => {
                throw err
              })

          })
      }
    }
  })

  /* Delete Issues */
  router.get('/:projectid/deleteissues/:issueid', helpers.isLoggedIn, helpers.isAdmin, (req, res, next) => {
    const projectid = req.params.projectid
    db.query('delete from activity where issueid = $1',[req.params.issueid],(err) =>{
      if(err){
        throw err
      }
    db.query('delete from issues where issueid = $1', [req.params.issueid], (err) => {
      if (err) {
        throw err
      }
        req.flash('success', 'Delete Complete')
        res.redirect(`/issues/${projectid}`)

      })
    })

  })



  return router;
}