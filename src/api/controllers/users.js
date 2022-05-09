const mongoose = require('mongoose');
const User = require('../models/user');
const Feed = require('../models/feed');
const Session = require('../models/session');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const zxcvbn = require('zxcvbn');
const ms = require('ms');
const sendMail = require('../../server/emails/send');

/**
 * @returns number random in 5 digit in string format
 */
function randomNumber () {
    const numberRandom = Math.floor((Math.random() * 5000), 0);
    return numberRandom.toString().padStart(5, Math.floor(Math.random() * 10 + 1)).toString();
}

/**
 * נרמול כתובת מייל - הסרת נקודות מיותרות, מה שאחרי הפלוס, וכדומה
 * לצורך וידוא שהמייל לא רשום כבר
 * @param {String} email כתובת המייל שהתקבלה מהמשתמש
 * @returns
 */
function normalizeEmail (email) {
    if (/g(oogle)?mail\.com|hotmail\.com|outlook\.com/.test(email)) {
        const emailRew = email.replace('googlemail', 'gmail');
        const emailParts = emailRew.split('@');
        let part1 = emailParts[0].replace(/.*\+/, '');
        if (/gmail\.com/.test(part1)) {
            part1 = part1.replaceAll('.', '');
        }
        return part1 + '@' + emailParts[1];
    } else {
        return email;
    }
}

module.exports = {
    signup: async (req, res) => {
        const { email, password, name } = req.body;

        if (!email) {
            return res.status(400).json({
                message: 'email parameter required'
            });
        }

        if (!password) {
            return res.status(400).json({
                message: 'password parameter required'
            });
        }

        if (!name) {
            return res.status(400).json({
                message: 'name parameter required'
            });
        }

        /**
         * normalize-email by regex
         */
        const emailProcessed = normalizeEmail(email);

        const weakness = zxcvbn(password);

        if (weakness.score < 1) {
            return res.status(400).json({
                message: 'Weak password',
                weakness: weakness.feedback
            });
        }

        let hash;
        try {
            hash = await bcrypt.hash(password, 10);
        } catch (error) {
            return res.status(500).json({
                error
            });
        }

        const users = await User.find({ emailProcessed });
        if (users.length > 0) {
            return res.status(409).json({
                message: 'Email exists'
            });
        }

        const verifyEmailCode = randomNumber();
        const userID = new mongoose.Types.ObjectId();

        const user = new User({
            _id: userID,
            password: hash,
            emailProcessed,
            emailFront: email,
            name,
            verifyEmailCode
        });

        try {
            await user.save();
        } catch (error) {
            return res.status(500).json({
                error
            });
        }

        try {
            const infoSend = await sendMail.verify(verifyEmailCode, email, name);
            console.log('Email sent: ' + infoSend.response);
            return res.status(200).json({
                message: 'User created and verification email sent'
            });
        } catch (error) {
            await User.findOneAndDelete({ emailProcessed });
            return res.status(500).json({
                message: 'Error sending email',
                error
            });
        }
    },
    login: async (req, res) => {
        const { email, password } = req.body;

        if (!email) {
            return res.status(400).json({
                message: 'email parameter required'
            });
        }

        const emailProcessed = normalizeEmail(email);

        if (!password) {
            return res.status(400).json({
                message: 'password parameter required'
            });
        }

        let users;
        try {
            users = await User.find({ emailProcessed });
        } catch (error) {
            return res.status(500).json({
                error
            });
        }

        if (users.length === 0) {
            return res.status(401).json({
                message: 'Auth failed'
            });
        }

        const [user] = users;

        let isMatch;
        try {
            isMatch = await bcrypt.compare(password, user.password);
        } catch (error) {
            return res.status(401).json({
                message: 'Auth failed'
            });
        }

        if (!isMatch) {
            return res.status(401).json({
                message: 'Auth failed'
            });
        }

        const sessionId = new mongoose.Types.ObjectId();
        try {
            await Session.create({
                _id: sessionId,
                userId: user._id
            });
        } catch (error) {
            return res.status(500).json({
                error
            });
        }

        const token = jwt.sign({ sessionId }, process.env.JWT_KEY);
        res.status(200).cookie('jwt', token, { path: '/', secure: true, httpOnly: true, maxAge: ms('30d') }).json({
            message: 'Auth successful',
            jwt: token
        });
    },
    logout: async (req, res) => {
        const { sessionId } = res.locals;

        if (!sessionId) {
            return res.status(400).json({
                message: 'sessionId parameter required'
            });
        }

        let sessionDelete;
        try {
            sessionDelete = await Session.findByIdAndDelete(sessionId);
        } catch (error) {
            return res.status(500).json({
                error
            });
        }

        if (!sessionDelete) {
            return res.status(409).json({
                message: 'Session not found'
            });
        }

        res.status(200).clearCookie('jwt').json({
            message: 'Logout successful',
            clearCookie: true
        });
    },
    verifyEmail: async (req, res) => {
        let { verifyCode } = req.query;
        const { _id: userID } = res.locals.user;

        if (!verifyCode) {
            return res.status(400).json({
                message: 'verifyCode parameter required'
            });
        }

        verifyCode = verifyCode.toString();

        if (verifyCode.length > 6 || /[0-9]{5,6}/.test(verifyCode) === false) {
            return res.status(400).json({
                message: `${verifyCode} is not a valid verifyCode`
            });
        }

        let user;
        try {
            user = await User.findById(userID);
        } catch (error) {
            return res.status(500).json({
                error
            });
        }

        if (!user) {
            return res.status(404).json({
                message: `User ${userID} is not found`
            });
        }

        if (verifyCode !== user.verifyEmailCode) {
            return res.status(401).json({
                message: 'verify failed - Wrong verification code'
            });
        }

        if (user.verified) {
            return res.status(409).json({
                message: 'verify failed - Email already verified'
            });
        }

        if (verifyCode === user.verifyEmailCode) {
            try {
                await User.findByIdAndUpdate(userID, { verified: true });
            } catch (error) {
                res.status(500).json({
                    error
                });
            }
        }

        return res.status(200).json({
            message: 'Verification successful'
        });
    },
    deleteUser: async (req, res) => {
        const userID = req.params.userID;

        if (!userID) {
            return res.status(400).json({
                message: 'userID parameter required'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(userID)) {
            return res.status(400).json({
                message: `userID ${userID} is not valid`
            });
        }

        let userDeleted;
        try {
            userDeleted = await User.findByIdAndDelete(userID);
        } catch (error) {
            return res.status(500).json({
                error
            });
        }

        if (!userDeleted) {
            return res.status(404).json({
                message: `User ${userID} is not found`
            });
        }

        // הסרת הסיסמה (ההאש שלה) מהפלט
        userDeleted.password = undefined;

        let unsubscribeFeedsCount;
        try {
            unsubscribeFeedsCount = (await Feed.updateMany({ Subscribers: userID }, { $pull: { Subscribers: userID } })).modifiedCount;
        } catch (error) {
            return res.status(500).json({
                error
            });
        }

        res.status(200).json({
            message: `userId ${userID} Deleted; Unsubscribed for ${unsubscribeFeedsCount} feeds.`,
            userDeleted,
            unsubscribeFeedsCount
        });
    },
    getUsers: async (req, res) => {
        let usersRew;
        try {
            usersRew = await User.find();
        } catch (error) {
            return res.status(500).json({
                error
            });
        }

        const users = usersRew.map((user) => {
            user.password = undefined;
            return user;
        });

        res.status(200).json({
            users
        });
    },
    resendVerificationEmail: async (req, res) => {
        const { _id: userID } = res.locals.user;
        let user;
        try {
            user = await User.findById(userID);
        } catch (error) {
            return res.status(500).json({
                error
            });
        }

        if (!user) {
            return res.status(404).json({
                message: `User ${userID} is not found`
            });
        }

        if (user.verified) {
            return res.status(409).json({
                message: `verify failed - Email ${user.emailFront} already verified`
            });
        }

        const delay = '1d';
        if (user.lastVerifyEmailSentAt && (Date.now() - user.lastVerifyEmailSentAt) < ms(delay)) {
            return res.status(429).json({
                message: `send verification email failed - last verification email sent at ${ms(Date.now() - user.lastVerifyEmailSentAt, { long: true })} ago. Please wait ${ms(ms(delay) - (Date.now() - user.lastVerifyEmailSentAt), { long: true })} before trying again`,
                tryAgainAfter: ms(ms(delay) - (Date.now() - user.lastVerifyEmailSentAt), { long: true })
            });
        }

        try {
            const infoSend = await sendMail.verify(user.verifyEmailCode, user.emailFront, user.name);
            console.log('Email sent: ' + infoSend.response);
            await User.findByIdAndUpdate(userID, { lastVerifyEmailSentAt: Date.now() });
        } catch (error) {
            return res.status(500).json({
                error
            });
        }

        return res.status(200).json({
            message: `verify email sent again to ${user.emailFront}`
        });
    }
};
