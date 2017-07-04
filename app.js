let express = require('express')
let cheerio = require('cheerio')
let superagent = require('superagent')

let app = express()


app.get('/', (req, res, next) => {
    superagent
        .get('https://cnodejs.org/')
        .end((err, sres) => {
            if (err) {
                return next(err)
            }
            let $ = cheerio.load(sres.text)
            console.log(sres)
            let item = []
            $('#topic_list .topic_title').each((idx, elm) => {
                let $elm = $(elm)
                item.push({
                    title: $elm.attr('title'),
                    href: $elm.attr('href')
                })
            })
            res.send(item)
        })
})



app.listen(3000)