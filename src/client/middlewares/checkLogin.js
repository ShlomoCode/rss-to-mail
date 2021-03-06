const jwt = require('jsonwebtoken');
const User = require('../../api/models/user');
const Session = require('../../api/models/session');

const checkLogin = async (req, res, next) => {
    let token = req.cookies.jwt || req.headers.authorization;
    if (!token) {
        if (req.originalUrl === '/login/') {
            return next();
        } else {
            return res.redirect('/login/');
        }
    }
    token = token.replace('Bearer ', '');

    let auth;
    try {
        auth = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        if (req.originalUrl !== '/login/') {
            return res.clearCookie('jwt').redirect('/login/');
        }
    }

    const { sessionId } = auth;

    const session = await Session.findById(sessionId);
    if (!session) {
        if (req.originalUrl !== '/login/') {
            return res.clearCookie('jwt').redirect('/login/');
        }
    }

    // אם ניסו לגשת לדף חיבור וכבר מחובר
    if (req.originalUrl === '/login/') {
        return res.redirect('/');
    }

    const user = await User.findById(session.userId);
    if (!user) {
        return res.status(404).clearCookie('jwt').json({
            message: 'User not found',
            clearCookie: true
        });
    }

    res.locals.user = user;
    res.locals.sessionId = sessionId;
    next();
};

module.exports = checkLogin;
