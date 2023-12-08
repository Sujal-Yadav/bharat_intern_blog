const mongoose = require('mongoose');

const blogsSchema = mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    fullname: String,
    profession: String,
    title: String,
    about: String,
    time: { type: Date, default: Date.now },
    
});

module.exports = new mongoose.model('Blog', blogsSchema);