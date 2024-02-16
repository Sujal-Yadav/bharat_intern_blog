const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const User = require('./models/User');
const Blog = require('./models/blog');
require('dotenv').config();
const fs = require('fs');
const app = express();
const session = require('express-session')
const MemoryStore = require('memorystore')(session)
const port = process.env.PORT;
// app.set('view engine', 'html');

app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    cookie: { maxAge: 86400000 },
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    secret: 'keyboard cat'
}))

mongoose.connect(process.env.MONGODB_URL);

const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/');
    }
};

// const isBlogAuthor = async (req, res, next) => {
//     const email = req.session.user.email;
//     const user = await User.findOne({ email });
//     const blogs = await Blog.find();
//     const id = user._id;

//     if (blogs) {
//         try {
//             const blog = await Blog.findOne({ author: id });
//             // console.log(blog);
//             if (!blog) {
//                 // res.sendFile("public/profile.html", { root: __dirname });
//                 res.redirect('/profile/addblog');
//             }

//             else if (blog.author.equals(user._id)) {
//                 next();
//             } else {
//                 res.redirect('/getblogs');
//             }
//         } catch (err) {
//             console.error(err);
//             res.render('error'); 
//         }
//     }
//     else {
//         res.redirect('/profile');
//     }

// }

app.get('/', (req, res) => {
    res.sendFile("public/login.html", { root: __dirname });
})

app.get('/signup', (req, res) => {
    res.sendFile("public/signup.html", { root: __dirname });
})

app.get('/homepage', isAuthenticated, (req, res) => {
    res.sendFile("public/home.html", { root: __dirname });
})

app.post('/signupuser', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        console.log("User found.");

        if (user) {
            return res.status(200).sendFile("public/login.html", { root: __dirname });
        }
        else {

            const userSignUp = new User({
                firstname: req.body.firstname,
                lastname: req.body.lastname,
                phone: req.body.phone,
                email: req.body.email,
                city: req.body.city,
                state: req.body.state,
                password: req.body.password,
                address: req.body.address,
            });

            await userSignUp.save();
            const email = req.body.email;
            const user = await User.findOne({ email: email });
            return res.status(200).redirect(`/getblogs/${user._id}`);

        }
    }
    catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
})

app.post('/userlogin', async (req, res) => {
    try {
        const email = req.body.email;
        const pass = req.body.password;
        const user = await User.findOne({ email });

        if (user) {
            if (user.email === email && user.password === pass) {
                req.session.user = { userId: user._id, email: user.email };
                return res.status(200).redirect(`/getblogs/${user._id}`);
            }
            else {
                return res.status(401).send("Incorrect password!");
            }
        }
        else {
            // alert("Your are not registered! PLease Sign Up");
            return res.status(200).sendFile("public/signup.html", { root: __dirname });
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/getblogs/:id', isAuthenticated, async (req, res) => {

    try {
        let htmlFile = fs.readFileSync(__dirname + '/public/home.html', 'utf8', err => {
            if (err) {
                console.log(err.message);

                throw err;
            }
            console.log('data written to file');
        });

        const array = await Blog.find();
        const user = await User.find({ userId: array.author });
        // console.log(user);
        let posts = "";
        array.forEach(element => {
            posts += `
                    <article class="flex max-w-xl flex-col items-start justify-evenly items-stretch border-solid border-2 border-black rounded-md p-8">
                        <div class="flex items-center gap-x-4 text-xs">
                            <time datetime="2020-03-16" class="text-gray-500">${element.time}</time>

                        </div>
                        <div class="group relative">
                            <h3 class="mt-3 text-lg font-semibold leading-6 text-gray-900 group-hover:text-gray-600">
                                <a href="#">
                                    <span class="absolute inset-0"></span>
                                    ${element.title}
                                </a>
                            </h3>
                            <div class="mt-5 overflow-hidden line-clamp-3 text-sm leading-6 text-gray-600">
                            <p >${element.about}</p>
                            </div>
                        </div>
                        <div class="relative mt-8 flex items-center gap-x-4">
                            <img src="https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                                alt="" class="h-10 w-10 rounded-full bg-gray-50">
                            <div class="text-sm leading-6">
                                <p class="font-semibold text-gray-900">
                                    <a href="#">
                                        <span class="absolute inset-0"></span>
                                        ${element.fullname}
                                    </a>
                                </p>
                                <p class="text-gray-600">${element.profession}</p>
                            </div>
                        </div>
                        <div class="grid grid-cols-2  gap-2 mt-3  text-left text-white">
                            <a href="/readBlog/${element._id}" class="btn col-span-1 text-white hover:bg-[#3b82f6] bg-[#1d4ed8]">Read</a>
                            <a href="#" class="btn col-span-1 text-white hover:bg-[#3b82f6] bg-[#1d4ed8]" onclick="copyToClipboard('${element._id}')">Share</a>

                        </div>
                    </article>`
        });
        // Replace the placeholder with the serialized data
        let modifiedhtml = htmlFile.replace('{ blogPosts }', posts);

        // Send the modified HTML to the client
        res.send(modifiedhtml);
        // res.status(200).send(`/getblogs?userId=${a}`,modifiedhtml);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
})

app.get('/shareBlog/:id', async (req, res) => {
    const blogId = req.params.id;

    try {
        const blog = await Blog.findById(blogId);

        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        const blogLink = `http://localhost:4000/readBlog/${blogId}`;
        res.json({ blogLink });
    } catch (error) {
        console.error('Error fetching blog:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/profile/addblog', isAuthenticated, async (req, res) => {
    const blog = req.params.blog;

    // if()
    try {
        const email = req.session.user.email;
        const user = await User.findOne({ email });
        console.log(user);
        const userId = (user._id);
        const blog = new Blog({
            author: userId,
            fullname: req.body.fullname,
            profession: req.body.profession,
            title: req.body.title,
            about: req.body.about
        })

        await blog.save();
        res.redirect(`/profile/getblogs`);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
})

app.get('/logout', (req, res) => {
    // Destroy the session on logout
    req.session.destroy(err => {
        if (err) {
            console.error(err);
        }
        res.redirect('/');
    });
});

app.get('/readBlog/:blogId', isAuthenticated, async (req, res) => {
    try {

        let htmlFile = fs.readFileSync(__dirname + '/public/blog.html', 'utf8', err => {
            if (err) {
                console.log(err.message);

                throw err;
            }
            console.log('data written to file');
        });

        const blogId = req.params.blogId;
        const blogPost = await Blog.findById(blogId);
        const user = await User.findOne(blogPost.author);
        let blog = "";
        blog = `<article class="max-w-2xl px-6 py-24 mx-auto space-y-16 dark:bg-white-800 dark:text-black-50">
                <div class="w-full mx-auto space-y-4">
                    <h1 class="text-5xl font-bold leadi">${blogPost.title}</h1>
                    
                    <p class="text-sm dark:text-black-400">by
                        <a href="#" target="_blank" rel="noopener noreferrer" class="hover:underline dark:text-violet-400">
                            <span>${user.firstname} ${user.lastname}</span>
                        </a>on
                        <time datetime="2021-02-12 15:34:18-0200">${blogPost.time}</time>
                    </p>
                </div>
                <div class="dark:text-black-100">
                    <p>${blogPost.about}</p>
                </div>
            </article>`

        let modifiedhtml = htmlFile.replace('{ blog }', blog);
        res.send(modifiedhtml);
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/readBlog/:blogId', isAuthenticated, (req, res) => {
    res.sendFile('public/blog.html', { root: __dirname });
});

app.get('/profile/getblogs/back', isAuthenticated, (req, res) => {
    res.redirect('/profile/getblogs');
});

app.get('/getblogs/back', isAuthenticated, (req, res) => {
    res.redirect('/getblogs');
});

app.get(`/profile/getblogs`, isAuthenticated, async (req, res) => {
    try {
        let htmlFile = fs.readFileSync(__dirname + '/public/profile.html', 'utf8', err => {
            if (err) {
                console.log(err.message);

                throw err;
            }
            console.log('data written to file');
        });

        const email = req.session.user.email;
        const user = await User.findOne({ email });
        const userId = user._id;
        const array = await Blog.find({ author: userId });
        let posts = "";
        array.forEach(element => {
            posts += `
                <article class="flex max-w-xl flex-col items-start justify-evenly items-stretch border-solid border-2 border-black rounded-md p-8">
                    <div class="flex items-center gap-x-4 text-xs">
                        <time datetime="2020-03-16" class="text-gray-500">${element.time}</time>

                    </div>
                    <div class="group relative">
                        <h3 class="mt-3 text-lg font-semibold leading-6 text-gray-900 group-hover:text-gray-600">
                            <a href="#">
                                <span class="absolute inset-0"></span>
                                ${element.title}
                            </a>
                        </h3>
                        <div class="mt-5 overflow-hidden line-clamp-3 text-sm leading-6 text-gray-600">
                        <p >${element.about}</p>
                        </div>
                    </div>
                    <div class="relative mt-8 flex items-center gap-x-4">
                        <img src="https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                            alt="" class="h-10 w-10 rounded-full bg-gray-50">
                        <div class="text-sm leading-6">
                            <p class="font-semibold text-gray-900">
                                <a href="#">
                                    <span class="absolute inset-0"></span>
                                    
                                </a>
                            </p>
                            <p class="text-gray-600">${element.profession}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 mt-3  text-left text-white">
                        <a href="/readBlog/${element._id}" class="btn col-span-1 text-white hover:bg-[#3b82f6] bg-[#1d4ed8]">Read</a>
                        <a href="/profile/deleteBlog/${element._id}" class="btn col-span-1 text-white hover:bg-[#3b82f6] bg-[#1d4ed8]">Delete</a>
                    </div>
                </article>`
        });
        // Replace the placeholder with the serialized data
        let modifiedhtml = htmlFile.replace('{ blogPosts }', posts);

        res.send(modifiedhtml);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/profile/getblogs', isAuthenticated, async (req, res) => {
    const email = req.session.user.email;
    const userId = await User.findOne({ email });
    const blog = await Blog.find();
    if (!blog) {
        res.sendFile("public/profile.html", { root: __dirname });
    }
    else {

        res.redirect(`/profile/getblogs`);
    }
})

app.get('/profile/deleteBlog/:blogId', isAuthenticated, async (req, res) => {
    const user = req.params.blogId;
    console.log(user);

    const blog = Blog.findOne({ userId: user })
    if (blog) {
        Blog.deleteOne({ _id: user })
            .then(result => {
                console.log(result);
                console.log("Blog Deleted")
            })
            .catch(error => {
                console.error(error);
            });
        return res.redirect(`/profile/getblogs`);
    } else {
        res.redirect('/profile')
    }


})

app.listen(port, () => {
    console.log(`listening on port http://localhost:${port}`);
});