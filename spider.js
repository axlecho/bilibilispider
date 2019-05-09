var http = require('http');
var url = require('url');
var util = require('util');

var rp = require('request-promise');
var fs = require('fs');
var progress = require('request-progress');
var clc = require('cli-color');
var	bar	= require('progress-bar').create(process.stdout);
var child_process = require('child_process');
const readline = require('readline');
var http = require('http');
var async = require('async');
const cheerio = require('cheerio')
var m3u8ToMp4 = require("m3u8-to-mp4");
var converter = new m3u8ToMp4();
const m3u8stream = require('m3u8stream')
let urltool = require('url');

var program = require('commander');

program
    .version('0.1.0')
    .option('--spider', 'spider info')
    .option('--sheep', 'got sheep')
    .parse(process.argv);

    if(program.spider) {
        spider()
    } else if(program.sheep) {
        getSheep()
    }

async function getSheep() {
    let dbstr = fs.readFileSync('data.json');
    let db = JSON.parse(dbstr)
    // console.log(db);
    async.mapLimit(db,8, async info => {
        if(info.done) {
            return 'downloaded'
        }
        
        try {
            if(info.url.endsWith('m3u8')) {
                await download(info.url,info.title)
            } else {
                await parserVedio(info)
                await raw(info)
                await download(info.url,info.title)
            }
            info.done = true
            await fs.writeFileSync('data.json',JSON.stringify(db,"","\t"))
        } catch (e) {
            console.log(e)
            return 'error'
        }
        return 'done'
    }, (err, contents) => {
        if (err) throw err
        console.log(contents)
    })
}

var db = []
async function spider() {
    for(var page = 1;page <= 1;page ++) {
        await getId(page)
    }
    
    fs.writeFileSync('data.json',JSON.stringify(db,"","\t"))
}

async function request(url){
    return new Promise(function(resolve){
        rp(url) 
            .then(function(res){
                resolve(res);
            })
            .catch(function(){
                resolve('');
            });
    });
}

async function getId(page) {
    let html = await request('http://www.susen7.com/vod/show/id/20/page/' + page + '.html')
    const $ = cheerio.load(html)
    const list = $('a.fed-list-pics')
    
    for(let i in list){
        try {
            let url = $(list[i]).attr('href')
          
            let id = $(list[i]).attr('href').replace(/[^0-9]/ig,'')
            console.log('==============> ' + id)
        
            let info = await parser(id)
            console.log(info)
            db.push(info)
        } catch (e) {
            console.log(e)
        }
       
    }
}

async function parser(id) {
    let info = {}
    let ret = await request('http://www.susen7.com/vod/play/id/' + id + '/sid/1/nid/1.html')
    const $ = cheerio.load(ret)
    info.url = JSON.parse($('div.fed-play-player script').html().replace('var player_data=','')).url
    info.title = $('span.fed-play-text').text()
    return info
}

async function parserVedio(info) {
    let ret = await request(info.url)
    const $ = cheerio.load(ret)
    let source = $('script:not([src])').html()
    var redirecturl = "https://jzav-999.com";
    var hostreg = new RegExp('var redirecturl = "(.*)";')
    var path = new RegExp('var main = "(.*)";');
    info.url = hostreg.exec(source)[1] + path.exec(source)[1];
    
    // info.url = JSON.parse($('div.fed-play-player script').html().replace('var player_data=','')).url      
}

async function raw(info) {
    let ret = await request(info.url)
    // console.log(ret)
    var path = /.*m3u8/
    // console.log(path.exec(ret))
    info.url = 'http://' + urltool.parse(info.url,false).host + path.exec(ret)[0];
}

async function download(url,title) {
    console.log('>> ' +title + '@' + url)
    await converter
        .setInputFile(url)
        .setOutputFile(title + '.mp4')
        .start();
}

async function download2(url,title) {
    console.log('>> ' +title + '@' + url)
    await m3u8stream(url)
    .pipe(fs.createWriteStream(title + '.mp4'));  
}
