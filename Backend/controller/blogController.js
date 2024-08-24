const Joi=require('joi');
const fs=require('fs');
const Blog=require('../model/blog');
const {BACKEND_SERVER_PATH}=require('../config/index');
const blogDto=require('../dto/blog');
const blogDetailsDto=require('../dto/blogDetailsDto');
const Comment=require('../model/comment');

const mongodbIdPattern = /^[0-9a-fA-F]{24}$/;
const blogController={
    async create(req,res,next){
        //Validte
        const blogRegisterSchema=Joi.object({
            title:Joi.string().required(),
            content:Joi.string().required(),
            photo:Joi.string().required(),
            author:Joi.string().regex(mongodbIdPattern).required()
        })
        const {error}=blogRegisterSchema.validate(req.body);
        if(error)
        {
            return next(error);
        }

        const {title,content,photo,author}=req.body;
        const buffer=Buffer.from(photo.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""),"base64");
        const imagePath=`${Date.now()}-${author}.png`;

        try {
            fs.writeFileSync(`storage/${imagePath}`,buffer);
        } catch (error) {
            return next(error);
        }

        let newBlog;
        try {
             newBlog=new Blog({
                title,
                content,
                photopath:`${BACKEND_SERVER_PATH}/storage/${imagePath}`,
                author,
            })
            await newBlog.save();
        } catch (error) {
            return next(error);
        }

        const BlogDto= new blogDto(newBlog);

        return res.status(201).json({blog:BlogDto});

    },

    async getall(req,res,next){
        try {
            const blogs= await Blog.find({});

            const blogsDto=[];
            for(let i=0;i<blogs.length;i++)
            {
                const dto = new blogDto(blogs[i]);
                blogsDto[i]=dto;
            }
            return res.status(200).json({blogs:blogsDto});
            
        } catch (error) {
            return next(error);
        }
    },

    async getbyid(req,res,next){
        const getbyidSchema=Joi.object({
            id:Joi.string().regex(mongodbIdPattern).required(),
        })
        const {error}=getbyidSchema.validate(req.params);
        if(error)
        {
            return next(error);
        }
        const {id}=req.params;
        let blog;
        try {
            blog=await Blog.findOne({_id:id}).populate('author');
        } catch (error) {
            return next(error);
        }
        const blogdto=new blogDetailsDto(blog);

        return res.status(200).json({blog:blogdto});
    },

    async update(req,res,next){
        const updateBlogSchema=Joi.object({
            title:Joi.string().required(),
            content:Joi.string().required(),
            author:Joi.string().regex(mongodbIdPattern).required(),
            blogId:Joi.string().regex(mongodbIdPattern).required(),
            photo:Joi.string()
        })
        const {error}=updateBlogSchema.validate(req.body);

        const {title,content,author,blogId,photo}=req.body;

        let blog;
        try {
            blog=await Blog.findOne({_id:blogId});
        } catch (error) {
            return next(error);
        }
       
        if(photo)
        {
            let previousPhoto = blog.photopath;
            previousPhoto = previousPhoto.split("/").at(-1);
      
            
            fs.unlinkSync(`storage/${previousPhoto}`);
      
            // read as buffer
            const buffer = Buffer.from(
            photo.replace(/^data:image\/(png|jpg|jpeg);base64,/, ""),"base64" );
      
            // allot a random name
            const imagePath = `${Date.now()}-${author}.png`;

            try {
                fs.writeFileSync(`storage/${imagePath}`, buffer);
            } catch (error) {
                return next(error);
            }

            await Blog.updateOne({_id:blogId},{title,content,photo:`${BACKEND_SERVER_PATH}/storage/${imagePath}`});
        }
        else{
            await Blog.updateOne({_id:blogId},{title,content});
        }
        return res.status(200).json({ message: "blog updated!" });
    },

    async delete(req,res,next){
        const deleteBlogSchema=Joi.object({
            id:Joi.string().regex(mongodbIdPattern).required(),
        })
        const {error}=deleteBlogSchema.validate(req.params);
        if(error)
        {
            return next(error);
        }
        const {id}=req.params;

        try {
            await Blog.deleteOne({_id:id});
            await Comment.deleteMany({blog:id});
        } catch (error) {
            return next(error);
        }
        return res.status(200).json({ message: "blog deleted" });
    }
}
module.exports=blogController;