const nodemailer = require('nodemailer');
const { decode } = require('html-entities');
const imageToBase64 = require('image-to-base64');
const bodyVerifyEmail = require('../temlate-verification');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.gmail_user,
        pass: process.env.gmail_password
    }
});

const sendMail = {
    /**
     *
     * @param {Object} info מידע על המייל שצריך להישלח
     */
    async rss (item, feedTitle, addresses) {
        let { description, link, title, thumbnail } = item;

        title = decode(title);

        title = title.replace(/([א-ת] )(צפו)/, '$1• $2');

        thumbnail = await imageToBase64(thumbnail);

        const cidImage = Math.random().toString(36).substring(2, 7);

        const mailOptions = {
            from: process.env.gmail_user,
            bcc: addresses,
            subject: 'RSS חדש! 🎉 ⟫ ' + title + ` | ${feedTitle}`,
            html: description + '<br>' + `<img src="cid:${cidImage}" height="240px">` + '<br>' + link,
            attachments: [{
                path: `data:image/jpg;base64,${thumbnail}`,
                filename: title,
                cid: cidImage
            }]
        };
        return transporter.sendMail(mailOptions)
            .then((info) => {
                console.log('Email sent: ' + info.response);
            })
            .catch(
                console.error
            );
    },
    /**
    * @param {Number} verifyCode
    * @param {String} address
    * @returns Promise
    */
    verify (verifyCode, address, name, userID) {
        const mailOptions = {
            from: process.env.gmail_user,
            to: address,
            subject: `קוד האימות שלך הוא: ${verifyCode}`,
            html: bodyVerifyEmail(userID, name, address, verifyCode)
        };
        return transporter.sendMail(mailOptions);
    }
};
module.exports = sendMail;
