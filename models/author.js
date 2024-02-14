const Blog = require('./blog');

async function isBlogAuthor(req, res, next) {
    const blogId = req.params.id;
    console.log(blogId);
    try {
        const blog = await Blog.findById(blogId);
        console.log(blog);
        // Check if the logged-in user is the author of the blog
        if (blog.author.equals(blog._id)) {
            next();
        } else {
            res.redirect('/profile/getBlogs'); // Redirect to the blogs list or handle unauthorized access
        }
    } catch (err) {
        console.error(err);
        res.render('error'); // Render an error page or handle the error as needed
    }
}

module.exports = isBlogAuthor;


