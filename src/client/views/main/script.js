const notifier = new AWN({
    position: 'bottom-left',
    labels: {
        error: 'שגיאה',
        success: 'הצלחה',
        info: 'מידע'
    }
});

async function createCostumeFeed () {
    const value = await swal(
        `
    הכנס כאן כתובת אתר/קטגוריה/תגית וכדו' למעקב.
    ניתן להכניס גם קישור ישיר לפיד`,
        {
            content: 'input',
            buttons: ['cannel', 'OK']
        }
    );

    if (value === null) {
        return notifier.info('בוטל בהצלחה!');
    }

    if (!/^https?:\/\/[\w-]+\.\w\w+/.test(value)) {
        return notifier.alert('לא זוהתה כתובת אתר תקינה!');
    }

    let url = value;
    url = url.replace(/(\/$)/, '');
    if (!/feed/.test(value)) {
        url = url + '/feed';
    }

    notifier.asyncBlock(
        axios.post('/feeds', { url }),
        (resp) => {
            console.log(resp.data);
            PushFeedToPage(resp.data.feedCreated);
            notifier.success('הפיד נוצר בהצלחה. כעת ניתן להירשם אליו');
        },
        (err) => {
            if (err.response.status === 409) {
                notifier.alert('הפיד הזה כבר קיים<br>...נסה להירשם אליו');
            } else {
                notifier.alert(`${err.response.status}: ${err.response.data.message}`);
            }
            console.log(err.response);
        },
        '...יוצר פיד'
    );
}

async function loadFeeds () {
    $('.feed-item').remove();

    const notifier = new AWN({ position: 'bottom-left' });
    notifier.asyncBlock(axios.get('/feeds'), (resp) => {
        const feeds = resp.data.feeds;

        if (feeds.length === 0) {
            return notifier.tip('עדיין אין פידים במערכת.<br>אתה יכול ליצור אחד... :)');
        }

        for (let i = 0; i < feeds.length; i++) {
            PushFeedToPage(feeds[i], [i]);
        }

        const loadedNotify = new AWN({ position: 'bottom-right', durations: { info: 1800 }, labels: { info: 'מידע' } }).info(`${feeds.length} פידים נטענו בהצלחה!`);
        $(loadedNotify).css('direction', 'rtl');
    });
}

function PushFeedToPage (feedItem) {
    const { title, subscriberSelf, Subscribers, _id, url } = feedItem;
    const item = `<div id="${_id}" class="feed-item">
    <h3><a href="${url.replace('/feed', '')}" target="_blank">${title}</a> <img src="https://www.google.com/s2/favicons?sz=16&domain_url=${url.replace('/feed', '')}" style="position: relative; top:3px"></h3>
    <div class="members-item-count" dir="rtl"><span>${Subscribers}</span> מנויים</div>
    <button class="Subscribe-btn" style="left: ${subscriberSelf ? '82px' : '92px'}">${subscriberSelf ? '➖ בטל הרשמה' : '➕ הרשמה'}</button>
    </div>`;
    $('#feeds').append(item);
    if (subscriberSelf) {
        $(`#${_id} .Subscribe-btn`).on('click', () => {
            unsubscribe(_id);
        });
    }
    if (!subscriberSelf) {
        $(`#${_id} .Subscribe-btn`).on('click', () => {
            subscribe(_id);
        });
    }
}

async function subscribe (feedID) {
    notifier.asyncBlock(
        axios.post(`/subscriptions/${feedID}`),
        (resp) => {
            const feedElement = $(`#${feedID} .Subscribe-btn`);
            feedElement.off('click');
            feedElement.on('click', () => {
                unsubscribe(feedID);
            });
            feedElement.text('➖ בטל הרשמה');
            feedElement.css('left', '82px');
            const subscribersCount = $(`#${feedID} .members-item-count > span`).text();
            $(`#${feedID} .members-item-count > span`).text(parseInt(subscribersCount) + 1);
            $('#subscribersCount span').text(parseInt(subscribersCount) + 1);
            new AWN({ durations: { success: 1800 } }).success('נרשמת בהצלחה');
        },
        (err) => {
            console.log(err.response);

            if (err.response.status === 429) {
                return notifier.alert(err.response.data.message);
            }

            if (err.response.status === 409) {
                return notifier.alert('אתה כבר רשום לפיד זה');
            }

            notifier.alert(err.response.data?.message);
        },
        '...נרשם'
    );
}

async function unsubscribe (feedID) {
    notifier.asyncBlock(
        axios.delete(`/subscriptions/${feedID}`),
        (resp) => {
            const feedElement = $(`#${feedID} .Subscribe-btn`);

            feedElement.off('click');

            feedElement.on('click', () => {
                subscribe(feedID);
            });

            feedElement.text('➕ הרשמה');
            feedElement.css('left', '92px');

            const subscribersCount = $(`#${feedID} .members-item-count > span`).text();
            $(`#${feedID} .members-item-count > span`).text(parseInt(subscribersCount) - 1);
            $('#subscribersCount span').text(parseInt(subscribersCount) - 1);

            new AWN({ durations: { success: 1800 } }).success('הוסרת בהצלחה');
        },
        (err) => {
            console.log(err.response);
            notifier.alert(err.response.data?.message);
        },
        '...מסיר'
    );
}

$('#sign-out').on('click', async () => {
    notifier.asyncBlock(
        axios.post('/users/log-out'),
        (resp) => {
            notifier.success('התנתקת בהצלחה');
            window.location.href = '/login';
        },
        (err) => {
            notifier.alert(err.response.data?.message);
        });
});

$('#add-costume-feed').on('click', createCostumeFeed);

// refresh feeds
$('#refresh-feeds').on('click', () => {
    loadFeeds();
});

// טעינת הפידים מיד בטעינת הדף
loadFeeds();