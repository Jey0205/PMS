
module.exports= {
    isLoggedIn: (req,res,next) => {
        if(req.session.user) {
            next()
        }else{
            res.redirect('/login')
        }
    },
    isAdmin: (req,res,next) =>{
        if(req.session.user.role == 'admin'){
          next()
        }
        else{
            req.flash('info', `You're not Admin, please contact your superior`)
            res.redirect('/')
        }
      }

}