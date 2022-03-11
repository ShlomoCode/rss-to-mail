# RSS TO MAIL
פרויקט nodeJS למעקב אחרי פידי RSS ושליחת העדכונים למייל.
כולל הרשמה, התחברות ואימות מייל.
מיועד לעלות בסוף על הרקו, מתאים גם להפעלה רגילה במחשב.

# API
`/api/users`
* login - `post`
* signup - `post`
* verify - `post`
* unsubscribe - `patch`
* delete - `post` (for admin only)

`/api/feeds`:

`get`: 
* get all feeds (for registered only)
* get feed (for registered only)

`post`:
* create feed (for registered only)

`delete` (feed id parameter requied):
* delete feed - for admin only

`/api/feeds/Subscribe` (feed id parameter requied):
* `post` - Subscribe
* `delete` - UnSubscribe

`/api/status` - `get`:
* get server status
# ספריות בשימוש:
* morgan - loger
* nodemon - לרענון אוטומטי של הרשת בכל שינוי
* express - שרת HTTP
* mongoose - התממשקות עם הדאטה בייס
* rss-to-json - קבלת הפידים כjson
* nodemailer - שליחת המיילים
* zxcvbn - בדיקת חוזק סיסמאות
* bcrypt - הצפנה ואימות לסיסמאות המשתמשים
* jsonwebtoken - ליצירת הטוקן (ואימות שלו במידלוור)
* html-entities - לטיפול באתרים ששולחים בפיד את התוים המיוחדים (מירכאות לדוגמה) בפורמט [HTML Entities](https://www.w3schools.com/html/html_entities.asp)
* html-metadata-parser - לקבלת תמונת הכתבה עבור אתרים שלא מחזירים תמונה בפיד, כגון JDN
* image-to-base64 - להורדת התמונה והמרתה לbase64
