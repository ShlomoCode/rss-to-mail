const mongoose = require('mongoose');
const Feed = require('../models/feed');

module.exports = {
    getAllFeeds: async (req, res) => {
        try {
            let feedsRew = await Feed.find()
            const feeds = feedsRew.map((feed) => {
                feed.Subscribers = feed.Subscribers.length;
                return feed;
            })
            res.status(200).json({
                feeds
            })
        } catch (error) {
            res.status(500).json({
                error
            })
        }
    },
    getFeed: async (req, res) => {
        const feedID = req.params.feedID

        if (mongoose.Types.ObjectId.isValid(feedID) !== true) {
            return res.status(400).json({
                message: `${feedID} no ObjectId Valid!`
            })
        }

        try {
            let feed = await Feed.findById(feedID)
            if (!feed) {
                return res.status(404).json({
                    message: 'Feed Not Found'
                })
            }
            feed.Subscribers = feed.Subscribers.length;
            res.status(200).json({
                feed
            })
        } catch (error) {
            res.status(500).json({
                error
            })
        }
    },
    createFeed: async (req, res) => {
        const { userID } = res.locals.user.userID;
        let { url } = req.body;

        if (!url) {
            return res.status(400).json({
                message: "Error: url A parameter required!"
            })
        }

        // הסרת לוכסן מיותר בסוף
        url = url.replace(/^(https?:\/\/[\w-]+\.\w{2,6}\/.*feed)\/$/, "$1")

        const feeds = await Feed.find({ url })
        if (feeds.length > 0) {
            return res.status(409).json({
                message: "Feed exists"
            })
        }

        const parse = require('../../rss2json');

        try {
            await parse(url)
        } catch (error) {
            return res.status(500).json({
                message: `${url} Not Normal feed`
            })
        }

        const feed = new Feed({
            _id: new mongoose.Types.ObjectId(),
            title,
            url,
            Subscribers: [userID]
        })
        try {
            await feed.save()
            res.status(200).json({
                message: "Crated Feed"
            })
        } catch (error) {
            res.status(500).json({
                error
            })
        }
    },
    SubscribeFeed: async (req, res) => {
        const feedID = req.params.feedID;
        const { userID } = res.locals.user;

        if (mongoose.Types.ObjectId.isValid(feedID) !== true) {
            return res.status(400).json({
                message: `${feedID} no ObjectId Valid!`
            })
        }

        let feedSubscribe;
        try {
            feedSubscribe = await Feed.findByIdAndUpdate(feedID, { $addToSet: { Subscribers: userID } })
        } catch (error) {
            res.status(500).json({
                error
            })
        }

        if (!feedSubscribe) {
            return res.status(404).json({
                message: "Feed Not Found"
            })
        }

        if (feedSubscribe.Subscribers.includes(userID) === true) {
            return res.status(409).json({
                message: "You are already a subscriber"
            })
        }

        res.status(200).json({
            message: "Subscribe to feed done!",
        })
    },
    UnSubscribeFeed: async (req, res) => {
        const feedID = req.params.feedID;
        const { userID } = res.locals.user;

        if (mongoose.Types.ObjectId.isValid(feedID) !== true) {
            return res.status(400).json({
                message: `${feedID} no ObjectId Valid!`
            })
        }

        let feedUnSubscribe;
        try {
            feedUnSubscribe = await Feed.findByIdAndUpdate(feedID, { $pull: { Subscribers: userID } })
        } catch (error) {
            res.status(500).json({
                error
            })
        }

        if (!feedUnSubscribe) {
            return res.status(404).json({
                message: "Feed Not Found"
            })
        }

        if (feedUnSubscribe.Subscribers.includes(userID) === false) {
            return res.status(409).json({
                message: "No subscription found"
            })
        }

        res.status(200).json({
            message: "UnSubscribe to feed done!",
        })
    },
    deleteFeed: async (req, res) => {
        const feedID = req.params.feedID

        if (mongoose.Types.ObjectId.isValid(feedID) !== true) {
            return res.status(400).json({
                message: `${feedID} no ObjectId Valid!`
            })
        }

        const feed = await Feed.findById(feedID)

        if (!feed) {
            return res.status(404).json({
                message: "Not Found Feed"
            })
        }

        if (res.locals.user.Permissions !== 'admin') {
            return res.status(403).json({
                message: 'No permission'
            })
        }

        try {
            await Feed.deleteOne({ _id: feedID })
            res.status(200).json({
                message: `Feed id: ${feedID} deleted.`
            })
        } catch (error) {
            res.status(500).json({
                error
            })
        }
    }
}