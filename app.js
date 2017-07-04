let express = require('express')
let cheerio = require('cheerio')
let superagent = require('superagent')
let url = require('url')
let eventproxy = require('eventproxy')
let async = require('async')
let debug = require('debug')('spy:dev')

const cnodeUrl = 'https://cnodejs.org/'

let app = express()


app.get('/', (req, res, next) => {
    superagent
        .get('https://cnodejs.org/')
        .end((err, sres) => {
            if (err) {
                return next(err)
            }
            let $ = cheerio.load(sres.text)
            let item = []
            let topicUrls = []
            $('#topic_list .topic_title').each((idx, elm) => {
                let $elm = $(elm)
                let href = url.resolve(cnodeUrl, $elm.attr('href'))
                item.push({
                    title: $elm.attr('title'),
                    href: $elm.attr('href')
                })
                topicUrls.push(href)
            })
            debug(topicUrls)
            let ep = new eventproxy()
            ep.after('topic', topicUrls.length, (topics) => {
                topics.map((topicPair) => {
                    let topicUrl = topicPair[0]
                    let topicHtml = topicPair[1]
                    let $ = cheerio.load(topicHtml)
                    return ({
                        title: $('.topic_full_title').text().trim(),
                        href: topicUrl,
                        comment1: $('.reply_content').eq(0).text().trim(),
                    })
                })
                debug('final: %s', topics[0])
            })
            //同时并发大量请求会导致IP被封
            // topicUrls.forEach((topicUrl) => {
            //     superagent
            //         .get(topicUrl)
            //         .end((err, res) => {
            //             debug(`fetch ${topicUrl} succeed`)
            //             ep.emit('topic', [topicUrl, res.text])

            //         })
            // })
            //用async模块进行请求池管理，保证同时只有5个链接
            async.mapLimit(topicUrls, 5, (url, callback) => {
                superagent
                    .get(url)
                    .end((err, res) => {
                        debug(`fetch ${url} succeed`)
                        //记住这里一定要调用callback不然async无法收到请求完成的通知
                        callback()
                        ep.emit('topic', [url, res.text])
                    })
            }, (err, result) => {
                debug(`finish:${result}`)
            })
            res.send(item)
        })
})



app.listen(3000)