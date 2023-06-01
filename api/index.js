const express=require('express');
const cors=require('cors');
const { default: mongoose } = require('mongoose');
const User=require('./models/User');
const Post=require('./models/Post');
const bcrypt=require('bcryptjs');
const app=express();
const jwt=require('jsonwebtoken'); //Taking json web token
const cookieParser=require('cookie-parser');
const multer=require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs=require('fs');

const salt= bcrypt.genSaltSync(10);
const secret='jdscgdyfbqwkjnfjuheiufbkjnd38udhjcnsaow';


app.use(cors({credentials:true,origin:'http://localhost:3000'}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads',express.static(__dirname+'/uploads'));

//connection statement to connect to mongodb database
//database name:'shravya1202'
mongoose.connect('mongodb+srv://shravya1202:shravya1202@cluster0.6j0o7ox.mongodb.net/?retryWrites=true&w=majority');

//to register
app.post('/register', async (req,res)=>{
    const{username,password}=req.body;
    try{
        const userDoc=await User.create({
            username,
            password:bcrypt.hashSync(password,salt),
        });
        res.json(userDoc);
    }
    catch(e){
      res.status(400).json(e);
    }
});

//to login
app.post('/login',async(req,res)=>{
    const {username,password}=req.body;
    const userDoc = await User.findOne({username});
    const passOk = bcrypt.compareSync(password,userDoc.password);
    if(passOk){
        //logged in
        jwt.sign({username,id:userDoc._id},secret,{},(err,token)=>{
            if(err) throw err;
            res.cookie('token',token).json({
                id:userDoc._id,
                username,
            });
        });
    }
    else{
        res.status(400).json('wrong credentials');
    }
});

//to make sure that login and register doesn't show up after logging in get the user information first and then make necessary changes in the header.js file
app.get('/profile',(req,res)=>{
  const {token}= req.cookies;
  jwt.verify(token,secret,{},(err,info)=>{
    if(err) throw err;
    res.json(info);
  });
});

app.post('/logout',(req,res)=>{
    res.cookie('token','').json('ok');
});

//creating new end point for CreateNewPost
app.post('/post',uploadMiddleware.single('file'),async (req,res)=>{
    const {originalname,path} = req.file;
    const parts=originalname.split('.');
    const ext=parts[parts.length-1];
    const newPath=path+'.'+ext;
    fs.renameSync(path,newPath);
    
    const {token}= req.cookies;
    jwt.verify(token,secret,{},async (err,info)=>{
        if(err) throw err;
        const {title,summary,content}=req.body;
        const postDoc = await Post.create({
          title,
          summary,
          content,
          cover:newPath,
          author:info.id,
    });
    res.json(postDoc);
 });
});

app.put('/post',uploadMiddleware.single('file'),async (req,res)=>{
    let newPath=null;
    if(req.file){
        const {originalname,path} = req.file;
        const parts=originalname.split('.');
        const ext=parts[parts.length-1];
        const newPath=path+'.'+ext;
        fs.renameSync(path,newPath);
    }
    
    const {token}=req.cookies;
    jwt.verify(token,secret,{},async (err,info)=>{
        if(err) throw err;
        const {id,title,summary,content}=req.body;
        const postDoc=await Post.findById(id);
        const isAuthor=JSON.stringify(postDoc.author) === JSON.stringify(info.id);
        if(!isAuthor){
            return res.status(400).json('you are not the author'); 
        } 
        
        await postDoc.updateOne({
            title,
            summary,
            content,
            cover:newPath ? newPath : postDoc.cover,
        });
        res.json(postDoc);
    });
});

app.get('/post',async (req,res)=>{
    res.json(
        await Post.find()
        .populate('author',['username'] )
        .sort({createdAt:-1})
        .limit(20)
        );
})

app.get('/post/:id', async (req,res)=>{
    const {id}=req.params;
    const posDoc=await Post.findById(id).populate('author',['username']);
    res.json(posDoc);
});


app.listen(4000);
 