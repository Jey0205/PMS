var express = require('express');
var router = express.Router();
const helpers = require('../helper/util')


module.exports = function (db) {
  /*PROJECT*/
  router.get('/AddProject', helpers.isLoggedIn, function (req, res, next) {
    let basename = 'Add Project'
    db.query('select users.userid, firstname , lastname,position from users', (err, result) => {
      if (err) {
        throw err
      }
      res.render('../views/project/add', { names: result.rows, session: req.session.user, base: basename })
    })
  })
  router.post('/AddProject', helpers.isLoggedIn, function (req, res, next) {
    db.query(`insert into projects(name) values($1) returning *`, [req.body.pname], (err, data) => {
      if (err) {
        throw err
      }
      let pros = data.rows[0].projectid
      let sql = "insert into members(userid, role, projectid) values";
      for (let i = 0; i < req.body.namelist.length; i++) {
        if (i < req.body.namelist.length - 1) {
          sql += `(${req.body.namelist[i]}, '', ${pros}),`;
        }
        if (i == req.body.namelist.length - 1) {
          sql += `(${req.body.namelist[i]}, '', ${pros})`;
        }
      }
      db.query(sql, (err) => {
        if (err) {
          throw err
        }
        res.redirect('/')
      })
    })
  })
  router.get('/DeleteProject/:id', helpers.isLoggedIn, helpers.isAdmin, (req, res, next) => {
    db.query('delete from members where projectid = $1', [req.params.id], (err) => {
      if (err) {
        throw err
      } db.query('delete from activity', (err) => {
        if (err) {
          throw err
        } db.query('delete from issues where projectid = $1', [req.params.id], (err) => {
          if (err) {
            throw err
          } db.query('delete from projects where projectid = $1', [req.params.id], (err) => {
            if (err) {
              throw err
            }
            req.flash('success', 'Project has been Deleted!')
            res.redirect('/')
          })
        })
      })

    })

  })
  router.get('/EditProject/:id', helpers.isLoggedIn, function (req, res, next) {
    let basename = 'Edit Project'
    db.query('select userid, firstname,lastname,position from users where userid in (select userid from members where projectid = $1)', [req.params.id], (err, done) => {
      if (err) {
        throw err
      } db.query('select userid, firstname,lastname,position from users where userid not in (select userid from members where projectid = $1)', [req.params.id], (err, undone) => {
        if (err) {
          throw err
        } db.query('select * from projects where projectid = $1', [req.params.id], (err, result) => {
          res.render('../views/project/edit', {
            data: result.rows[0],
            session: req.session.user,
            base: basename,
            names: done.rows,
            undone: undone.rows
          })
        })
      })
    })

  })
  router.post("/EditProject/:id", helpers.isLoggedIn, (req, res) => {
    let projectid = parseInt(req.params.id);
    db.query("delete from members where projectid = $1", [projectid], (err) => {
      db.query(
        "update projects set name = $1 where projectid= $2",
        [req.body.name, projectid],
        (err) => {
          if (err) {
            throw err
          }
          let sql = "insert into members(userid, role, projectid) values";

          for (let i = 0; i < req.body.namelist.length; i++) {
            if (i < req.body.namelist.length - 1) {
              sql += `(${req.body.namelist[i]}, '', ${projectid}),`;
            }
            if (i == req.body.namelist.length - 1) {
              sql += `(${req.body.namelist[i]}, '', ${projectid})`;
            }
          }
          db.query(sql, (err) => {
            if (err) {
              throw err
            }
            res.redirect("/");
          });
        }
      );
    });
  });
  return router
}