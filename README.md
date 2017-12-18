# 🌈 mjmlhelper 🌈

mjmlhelper is a simple converter that makes html files from [mjml](https://mjml.io) usable in the drag&drop editor of [CleverReach](https://www.cleverreach.com/en/).

it also includes a mail function and a small boilerplate.

## installation

```
npm init -y && npm install mjmlhelper --save
```

## setup

copy out a small mjml boilerplate:
```
cp -r ./node_modules/mjmlhelper/boilerplate/* .
cp example.mjmlhelper.json mjmlhelper.json
cp example.gitignore .gitignore
```

then edit your smtp credentials in mjmlhelper.json for sending out emails:
```json
{
    "from": "from@tld.com",
    "smtp": "your.hostname.com",
    "username": "your-username",
    "password": "your-password",
    "port": 465,
    "ssl": "tls",
    "to": "to@tld.com",
    "inline_images": true,
    "log": "log.txt"
}
```

you can also specify an array or a textfile for the to-argument:
```json
    "to": ["to@tld.com","to2@tld.com"]
    "to": "list.txt"
```

## usage

do your daily mjml stuff
```
node ./node_modules/mjml/bin/mjml --watch index.mjml -o index.html
```

send out a test mail (local images are automatically inlined)
```
node ./node_modules/mjmlhelper/mjmlhelper.js mail
```

create a ready-to-import zip file for CleverReach
```
node ./node_modules/mjmlhelper/mjmlhelper.js convert
```