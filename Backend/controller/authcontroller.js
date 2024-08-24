const Joi=require('joi');
const User=require('../model/user');
const bcrypt=require('bcryptjs');
const UserDTO = require('../dto/user');
const jwtService=require('../services/JWTservice');
const RefreshToken=require('../model/token');

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,25}$/;
const authController={

    async register(req ,res ,next) {
        // 1. validate user input
        const userRegisterSchema=Joi.object({
            name:Joi.string().max(30).required(),
            username:Joi.string().min(5).max(30).required(),
            email:Joi.string().email().required(),
            password:Joi.string().pattern(passwordPattern).required(),
            confirmPassword:Joi.ref('password'),
        })
        const {error}=userRegisterSchema.validate(req.body);

        // 2. if error in validation -> return error via middleware
        if(error)
        {
            return next(error);
        }

        // 3. if email or username is already registered -> return an error
        const {name,username,email,password}=req.body;
        try {
            const emailInUse=await User.exists({email});
            const usernameInUse=await User.exists({username});

            if(emailInUse)
            {
                const error={
                    status:409,
                    message:'Email Is Already Registered,Use Another Email',
                };
                return next(error);
            }
            if(usernameInUse)
            {
                const error={
                    status:409,
                    message:'username Is Already Registered,Use Another UserName',
                };
                return next(error);
            }

        } catch (error) {
            return next(error); 
        }

        // 4. password hash 
        const hashedPassword= await bcrypt.hash(password,10);

        // 5. store user data in db
      let accessToken;
      let refreshToken;
      let user;

      try {
        const userToRegister=new User({
            name,
            username,
            email,
            password:hashedPassword,
        })
        user=await userToRegister.save();

        accessToken=jwtService.signAccessToken({_id:user._id,username},'30m');
        refreshToken=jwtService.signRefreshToken({_id:user._id},'60m');
        
      } catch (error) {
        return next(error);
      }

      await  jwtService.storeRefreshToken(refreshToken,user._id);

      res.cookie('AccessToken',accessToken,{
        maxAge:1000*60*60*24,
        httpOnly:true
      });
      res.cookie('RefreshToken',refreshToken,{
        maxAge:1000*60*60*24,
        httpOnly:true
      });
        
        const userDto=new UserDTO(user);
        return res.status(201).json({user:userDto,auth : true});
    },


    async login(req,res,next){
    // 1. validate user input
    const userLoginSchema=Joi.object({
        username:Joi.string().min(5).max(30).required(),
        password:Joi.string().pattern(passwordPattern),
    })
    // 2. if validation error, return error
    const {error}=userLoginSchema.validate(req.body);
    if (error) {
      return next(error);
    }
    const { username, password } = req.body;

    // 3. match username and password
    let user;
    try {
        user=await User.findOne({username:username});
        if(!user)
        {
            const error={
                status:401,
                message:"Invalid Username",
            }
            return next(error);
        }
        const matchPassword=await bcrypt.compare(password,user.password);
        if(!matchPassword)
        {
            const error={
                status:401,
                message:"Invalid Password"
            }
            return next(error);
        }
    } catch (error) {
        return next(error);
    }
    const accessToken=jwtService.signAccessToken({_id:user._id},'30m');
    const refreshToken=jwtService.signRefreshToken({_id:user._id},'60m');

    try {
        await RefreshToken.updateOne(
          {
            _id: user._id,
          },
          { token: refreshToken },
          { upsert: true }
        );
      } catch (error) {
        return next(error);
      }

    res.cookie('accessToken',accessToken,{
        maxAge:1000*60*60*24,
        httpOnly:true
      });
      res.cookie('refreshToken',refreshToken,{
        maxAge:1000*60*60*24,
        httpOnly:true
      });
    const userDto=new UserDTO(user);

    return res.status(200).json({user:userDto,auth:true});
    },

    async logout(req,res,next){
        const {refreshToken}=req.cookies;
        try {
            await RefreshToken.deleteOne({token:refreshToken});
        } catch (error) {
            return next(error);
        }
        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

        res.status(200).json({user:null,auth:false});
    },

    async refresh(req, res, next) {
        // 1. get refreshToken from cookies
        // 2. verify refreshToken
        // 3. generate new tokens
        // 4. update db, return response
    
        const originalRefreshToken = req.cookies.RefreshToken;
    
        let id;
    
        try {
          id = jwtService.verifyRefreshToken(originalRefreshToken)._id;
        } catch (e) {
          const error = {
            status: 401,
            message: "Unauthorized",
          };
    
          return next(error);
        }
    
        try {
          const match = RefreshToken.findOne({
            _id: id,
            token: originalRefreshToken,
          });
    
          if (!match) {
            const error = {
              status: 401,
              message: "Unauthorized",
            };
    
            return next(error);
          }
        } catch (e) {
          return next(e);
        }
    
        try {
          const accessToken = jwtService.signAccessToken({ _id: id }, "30m");
    
          const refreshToken = jwtService.signRefreshToken({ _id: id }, "60m");
    
          await RefreshToken.updateOne({ _id: id }, { token: refreshToken });
    
          res.cookie("accessToken", accessToken, {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true,
          });
    
          res.cookie("refreshToken", refreshToken, {
            maxAge: 1000 * 60 * 60 * 24,
            httpOnly: true,
          });
        } catch (e) {
          return next(e);
        }
    
        const user = await User.findOne({ _id: id });
    
        const userDto = new UserDTO(user);
    
        return res.status(200).json({ user: userDto, auth: true });
      },

}

module.exports=authController;