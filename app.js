#!/usr/bin/env node

var fs = require("fs");
var path = require("path");
var jsdom = require("jsdom");
var http = require('http');

var emojis = []

var workingDirectory = "./scrapper";

links = [];

loadState()

function loadState()
{
    require.extensions['.json'] = function (module, filename) {
        module.exports = fs.readFileSync(filename, 'utf8');
    };
    try
    {
        var emojisJSON = require("/Users/cian/Desktop/scrapper/emojis.json");
        var emojisObject = JSON.parse(emojisJSON);
    }
    catch(e)
    {
        var emojisObject = {};
        emojisObject.emojis = [];
    }

    emojis = emojisObject.emojis;

    jsdom.env(
      "http://emojipedia.org/apple/",
      ["http://code.jquery.com/jquery.js"],
      function (err, window) {
        window.$(".emoji-grid a").each(function(e){links.push(this.href)})
        parseLinks(emojis.length);
      }
    );
}

function parseLinks(index)
{
    if (!links[index]) 
    {
        saveState();
        return;
    }
    jsdom.env(
      links[index],
      ["http://code.jquery.com/jquery.js"],
      function (err, window) {

        var $ = window.$;
        var emoji = {};

        var unicode = $(".emoji-copy").attr("value");
        var shortcodeElement = $(".shortcodes li")[0];
        var shortcode = shortcodeElement ? shortcodeElement.innerHTML : "";
        var vendorElements = $(".vendor-list li .vendor-info h2 a");
        var imageElements = $(".vendor-list li .vendor-image a img");

        var vendors = {};

        var dir = workingDirectory + "/" + unicode + "/";
        if (!fs.exists(dir)){
            fs.mkdir(dir);
        }

        for (var i = 0; i < vendorElements.length; i++) {
            var vendor = vendorElements[i].innerHTML;
            var imgURL = imageElements[i].src;
            vendors[vendor] = unicode + "/" + vendor + ".png";

            downloadFile(imgURL, vendor + ".png", dir);
        };

        var tags = [];
        var aliasElements = $(".aliases li")

        for (var i = 0; i < aliasElements.length; i++) {
            var potentialTags = aliasElements[i].innerHTML.split(" ");

            for (var j = 2; j < potentialTags.length; j++) {
                var potentialTag = potentialTags[j].toLowerCase();
                if (potentialTag != "emoji" && tags.indexOf(potentialTag) == -1)
                {
                    tags.push(potentialTag);
                }
            };
        };

        emoji.Identifier = index;
        emoji.Unicode = unicode;
        emoji.Shortcode = shortcode;
        emoji.Emoji_Images = vendors;
        emoji.Tags = tags;

        emojis.push(emoji);

        if(index % 50 == 0)
            saveState();

        if(index < links.length)
        {
            index++;
            parseLinks(index);
        }
      }
    );
}

function saveState()
{
    var output = JSON.stringify({"emojis": emojis});
    fs.writeFile(workingDirectory + "/emojis.json", output);    
}

function downloadFile(url, fileName, dir)
{
    var file = fs.createWriteStream(dir + fileName);
    var request = http.get(url, function(response) {
      response.pipe(file);
    });
}
