const express=require('express');
const authController=require('../controller/authcontroller');
const auth = require('../middlewares/auth');
const blogController=require('../controller/blogController');
const router=express.Router();
const commentController=require('../controller/commentContoller');
//user

//register
router.post('/register',authController.register);
//login
router.post('/login',authController.login);
//logouts
router.post('/logout',auth,authController.logout);
//refresh
router.get('/refresh',authController.refresh);

//blog
//create
router.post('/blog', auth,blogController.create);
//read all blog
router.get('/blog/all', auth,blogController.getall);
//read blog by id
router.get('/blog/:id', auth,blogController.getbyid);
//delete
router.delete('/blog/:id', auth, blogController.delete);
//update
router.put('/blog', auth, blogController.update);
// comment
// create 
router.post('/comment', auth, commentController.create);
// get 
router.get('/comment/:id', auth, commentController.getById);

module.exports=router;